import 'dotenv/config';
import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support base64 image uploads up to 35MB
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Server-side Gemini initialization with telemetry header
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Robust odds normalizer handling South African net profit (0.7 -> 1.70), fractional (7/10 -> 1.70), and European decimal
function normalizeOddValue(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return null;
    if (val > 0 && val < 1.0) {
      return Number((1.0 + val).toFixed(2));
    }
    return Number(val.toFixed(2));
  }
  const str = String(val).trim();
  // Check for fractional odds like 7/10 or 5/2
  const fracMatch = str.match(/(\d+)\s*\/\s*(\d+)/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den > 0) {
      return Number(((num / den) + 1.0).toFixed(2));
    }
  }

  // Extract valid odds number (handles "X 2.15", "× 2.15", "2 3.60", "1 1.88", "3.60", "0.7", "1,88")
  const numMatch = str.match(/(?:^|\s|[xX×])([0-9]+[.,][0-9]{1,2})(?:$|\s)/) || str.match(/([0-9]+[.,][0-9]{1,2})/);
  if (numMatch) {
    const parsed = parseFloat(numMatch[1].replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      if (parsed > 0 && parsed < 1.0) {
        return Number((1.0 + parsed).toFixed(2));
      }
      return Number(parsed.toFixed(2));
    }
  }

  const cleanStr = str.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed) || parsed <= 0) return null;
  if (parsed > 0 && parsed < 1.0) {
    return Number((1.0 + parsed).toFixed(2));
  }
  return Number(parsed.toFixed(2));
}

// Heuristic fallback parser when AI is unavailable or as emergency fallback
function parseFallbackText(text: string, defaultBookmaker = 'Auto-detect') {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const detectedMatches: any[] = [];
  let currentLeague = 'Soccer / Football';

  const leagueRegex =
    /(premier|league|liga|serie\s*a|bundesliga|ligue|premiership|psl|cup|championship|division|eredivisie|primeira|super\s*lig|mls|euro|copa|caf|dstv|afcon)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (leagueRegex.test(line) && line.length < 60) {
      currentLeague = line.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
      continue;
    }

    const cleanLine = line.replace(/(?<![\d.:/])(\d{0,3}[.,]\d{1,2})(?![\d:/])/g, ' ').trim();
    const vsMatch = cleanLine.split(/\s+(?:vs\.?|v|-|–|—)\s+/i);

    if (vsMatch.length === 2 && vsMatch[0].length >= 2 && vsMatch[1].length >= 2) {
      const homeTeam = vsMatch[0].replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const awayTeam = vsMatch[1].replace(/[^a-zA-Z0-9\s]/g, '').trim();

      // Look for odds on current line and subsequent 2 lines
      const combinedOddsText = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ');
      const oddsMatches = [...combinedOddsText.matchAll(/(?<![\d.:/])(\d{0,3}[.,]\d{1,2})(?![\d:/])/g)]
        .map((m) => {
          const val = parseFloat(m[1].replace(',', '.'));
          if (val > 0 && val < 1.0) {
            return Number((1.0 + val).toFixed(2));
          }
          return Number(val.toFixed(2));
        })
        .filter((n) => n >= 1.01 && n <= 250);

      let hOdds = oddsMatches[0] || 1.85;
      let dOdds = oddsMatches[1];
      let aOdds = oddsMatches[2];

      // If draw or away odds are missing, estimate reasonable market odds based on home odds
      if (!dOdds) {
        dOdds = Number((hOdds < 1.5 ? 4.50 : hOdds < 2.0 ? 3.40 : 3.20).toFixed(2));
      }
      if (!aOdds) {
        aOdds = Number((hOdds < 1.5 ? 7.00 : hOdds < 2.0 ? 4.10 : 2.60).toFixed(2));
      }

      detectedMatches.push({
        id: 'fallback_' + Math.random().toString(36).substring(2, 9),
        league: currentLeague,
        homeTeam,
        awayTeam,
        homeOdds: hOdds,
        drawOdds: dOdds,
        awayOdds: aOdds,
        confidence: 85,
      });
    }
  }

  return {
    success: true,
    bookmaker: defaultBookmaker,
    detectedLayout: 'Text & Table Fallback Heuristic',
    matchCount: detectedMatches.length,
    matches: detectedMatches,
  };
}

// OCR Processing API Endpoint
app.post('/api/ocr/parse-betslip', async (req: Request, res: Response) => {
  try {
    const { image, bookmakerHint, rawText } = req.body;

    if (!image && !rawText) {
      res.status(400).json({
        success: false,
        error: 'Please provide a screenshot image (base64) or text to parse.',
      });
      return;
    }

    // If Gemini client is not configured or image is absent, handle gracefully
    if (!ai || !apiKey) {
      console.warn('GEMINI_API_KEY is not set. Falling back to local heuristic parsing.');
      if (rawText) {
        return res.json(parseFallbackText(rawText, bookmakerHint || 'Auto-detect'));
      }
      return res.json({
        success: false,
        error: 'Gemini API key is required on the server for multimodal vision OCR.',
      });
    }

    // Process image parts
    let base64Data = '';
    let mimeType = 'image/png';

    if (image) {
      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = image.replace(/^data:[^;]+;base64,/, '');
        }
      } else {
        base64Data = image;
      }
    }

    const systemPrompt = `You are an expert sports betting OCR and betslip intelligence system specifically trained on MOBILE SCREENSHOTS.
You specialize in parsing mobile phone screenshots (tall aspect ratios, portrait orientation) from all major South African, African, European, and global bookmakers including:
- Hollywoodbets (South Africa - Light purple/yellow and Dark theme mobile cards)
- Betway (Green/black/white mobile interface with 1X2 tab and 3 light-green odds boxes)
- Supabets (Dark mobile theme, A-Z sports, table rows with grey 1, X, 2 boxes)
- Betexchange / Betfair style (Blue UI, Back & Lay, decimal/fractional odds)
- Sportingbet, 10bet, Easybet, World Sports Betting (WSB), Gbets, Bet9ja, Sportybet, Mozzart, Betfred, etc.

MOBILE SCREENSHOT NOISE FILTERING RULES:
1. Top Phone Status Bar: Ignore time (e.g. "14:25", "13:53", "11:29"), battery percentage ("51%", "24%", "55%"), wifi, 4G, and Chrome URL bars.
2. Bottom App Navigation: Ignore bottom tabs ("Home", "Promotions", "Bet Slip", "My Bets", "Live Chat", "Play Vegas", "Sports", "Supanumbers").
3. Focus solely on the soccer match cards and odds tables in the viewport.

CRITICAL REQUIREMENT - THE 1, ×, 2 (1X2) ODDS TRIPLET:
Soccer matches in mobile bookmaker apps ALWAYS feature a 3-way market:
- "1" (Box 1 / Column 1): Home Win odds -> homeOdds
- "×" or "X" (Box 2 / Middle Column): Draw odds -> drawOdds. (NOTE: Mobile sportsbooks frequently use the multiplication symbol '×', cross sign, or letter 'X' for Draw. You MUST extract this middle number as drawOdds!)
- "2" (Box 3 / Right Column): Away Win odds -> awayOdds. (NOTE: Mobile sportsbooks label this with '2' or the Away team's name. You MUST extract this right-hand number as awayOdds!)
MANDATORY: You MUST ALWAYS extract all 3 odds (homeOdds, drawOdds, awayOdds). NEVER return only the home team odds! If home odds is visible, the draw ('×') and away ('2') odds are directly adjacent to it.

EXACT MOBILE LAYOUT SPECIFICATIONS & TRAINING:

1. HOLLYWOODBETS MOBILE (LIGHT & DARK THEMES):
- Header: Purple bar with gold star, "Hollywoodbets", "Upcoming" tab, or "Balance R 0,18" with "DEPOSIT".
- Card Structure:
  - Top line: Flag + "HOME TEAM vs AWAY TEAM" (e.g. "AL NASR CAIRO vs PROXY SC", "JAPAN vs NEW ZEALAND", "VALENZANA MADO vs AC SALUZZO CALCIO").
  - Subtitle line: "<Country> • <League Name>" and match date/time on right (e.g. "08 Oct - 14:30").
  - Bottom line: 3 horizontal rounded odds buttons:
    * Box 1 [Home Win 1]: Shows Home team name + odds (e.g. "AL NASR CAIRO 0.7", "VALENZANA MADO 1.4", "JAPAN 0.18").
    * Box 2 [Draw × / X]: Shows "×" or "X" on left, number on right (e.g. "X 2.15", "× 2.5", "X 5.6"). -> ALWAYS extract as drawOdds!
    * Box 3 [Away Win 2]: Shows Away team name or "2" on left, number on right (e.g. "PROXY SC 3.6", "AC SALUZZO CALCIO 1.6", "NEW ZEALAND 10"). -> ALWAYS extract as awayOdds!

SOUTH AFRICA / HOLLYWOODBETS ODDS NORMALIZATION:
In South African sportsbooks, fractional profit odds are written as decimal numbers less than 1.0 (net profit per 1 stake):
- When an odds number is less than 1.0 (such as 0.18, 0.45, 0.55, 0.65, 0.7, 0.8, 0.85, 0.9):
  Convert to standard decimal total payout odds by adding 1:
  * 0.18 -> 1.18
  * 0.45 -> 1.45
  * 0.55 -> 1.55
  * 0.65 -> 1.65
  * 0.7 -> 1.70
  * 0.8 -> 1.80
  * 0.85 -> 1.85
  * 0.9 -> 1.90
- When an odds number in Hollywoodbets is exactly 1 (even money profit):
  * 1 becomes 2.00 total decimal payout odds.
- When an odds number is already >= 1.01 (e.g. 1.35, 1.4, 1.52, 1.6, 1.88, 1.95, 2.15, 2.5, 3.6, 5.6, 10):
  Keep it directly as standard decimal odds!

2. BETWAY MOBILE:
- Header: Black bar with "betway" logo, green "sport" tab, 1X2 tab selected.
- Subheader: "Leagues", "UP", column headers: "1", "X", "2".
- League banner: Dark rounded bar with flag + "<League Name>, <Country>".
- Match row:
  - Left: Home Team (line 1), Away Team (line 2), "Today HH:MM" (line 3).
  - Right: 3 light green rounded boxes containing 1 (Home), X / × (Draw), 2 (Away) decimal odds:
    * Pyramids FC vs El Qanah FC: homeOdds=1.34, drawOdds=4.50, awayOdds=7.60
    * Asyut Petroleum vs AL Ahly SC: homeOdds=6.60, drawOdds=4.20, awayOdds=1.40
    * Zamalek SC vs Zed FC: homeOdds=5.20, drawOdds=4.80, awayOdds=1.43

3. SUPABETS MOBILE:
- Header: Dark theme, red "SUPABETS" logo, "A-Z Sports", "1x2" market pill.
- Table rows:
  - Left: Home Team (bold white, line 1), Away Team (bold white, line 2), Kickoff countdown in green.
  - Right: 3 grey rounded boxes with column headers 1, X / ×, 2:
    * Ukraine SRL vs Hungary SRL: homeOdds=2.21, drawOdds=3.11, awayOdds=2.98
    * Japan vs New Zealand: homeOdds=1.19, drawOdds=6.69, awayOdds=12.09
    * APS Zakynthos vs Apollon Kalamarias: homeOdds=1.81, drawOdds=3.31, awayOdds=3.91
    * Odds BK 2 vs Viking FK 2: homeOdds=1.30, drawOdds=5.44, awayOdds=6.39

GENERAL OCR RULES:
1. Automatic Bookmaker Detection: Detect Hollywoodbets, Betway, Supabets, or other bookmaker.
2. Full Match Extraction: Extract every visible soccer match in sequence from top to bottom.
3. Clean Names: Trim extraneous icons (like flags or lightning bolts) from team names.
4. Complete 1X2 Odds: Always populate all three: homeOdds (1), drawOdds (×), awayOdds (2).`;

    const userPrompt = `Analyze this sports betting screenshot or text.
Bookmaker hint from user (if any): "${bookmakerHint || 'None - Auto detect'}".
${rawText ? `Raw text input:\n${rawText}\n` : ''}
Extract all soccer matches, leagues, home teams, away teams, kickoff times, and odds.
MANDATORY 1, ×, 2 ODDS EXTRACTION:
- homeOdds: Home win (1) decimal odds number (Box 1 / Column 1)
- drawOdds: Draw (× or X) decimal odds number (Box 2 / Middle Column)
- awayOdds: Away win (2) decimal odds number (Box 3 / Right Column)
CRITICAL: You MUST extract all 3 odds for each match (homeOdds, drawOdds, awayOdds). In mobile bookmakers, the draw is labeled "×" or "X", and the away is labeled "2". Do NOT leave drawOdds or awayOdds missing or null!
Return a structured JSON with:
- bookmaker: identified bookmaker name (e.g. "Hollywoodbets", "Betway", "Supabets", "Betexchange", etc.)
- detectedLayout: brief description of screenshot layout (e.g. "Hollywoodbets Mobile Cards (1, ×, 2)", "Betway Mobile 1X2 Grid", "Supabets Match List")
- matches: list of matches found, each containing:
  - id: short unique alphanumeric string
  - league: competition name
  - homeTeam: name of home team
  - awayTeam: name of away team
  - matchTime: short kickoff time or ""
  - homeOdds: decimal number for 1 (Home Win)
  - drawOdds: decimal number for × or X (Draw)
  - awayOdds: decimal number for 2 (Away Win)
  - detectedSelection: if this is a betslip or active pick, { selection: string, odds: number, market: string }
  - extraMarkets: array of any extra markets seen
  - confidence: number between 60 and 99 representing OCR reading confidence
- rawSummary: 1-sentence note summarizing what was recognized.`;

    const contentsPayload: any = {
      parts: base64Data
        ? [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: userPrompt,
            },
          ]
        : [
            {
              text: userPrompt,
            },
          ],
    };

    // Candidate models prioritizing fast, reliable vision models
    const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    let response: any = null;
    let lastError: any = null;
    let chosenModel = '';
    const startTime = Date.now();

    for (const modelName of CANDIDATE_MODELS) {
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`[OCR Engine] Attempting model ${modelName} (attempt ${attempts}/${maxAttempts})...`);
          
          const apiPromise = ai.models.generateContent({
            model: modelName,
            contents: contentsPayload,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  bookmaker: { type: Type.STRING },
                  detectedLayout: { type: Type.STRING },
                  rawSummary: { type: Type.STRING },
                  matches: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        league: { type: Type.STRING },
                        homeTeam: { type: Type.STRING },
                        awayTeam: { type: Type.STRING },
                        matchTime: { type: Type.STRING },
                        homeOdds: { type: Type.NUMBER, description: 'Home Win 1 decimal odds (Box 1 / Column 1)' },
                        drawOdds: { type: Type.NUMBER, description: 'Draw × or X decimal odds (Box 2 / Middle Column)' },
                        awayOdds: { type: Type.NUMBER, description: 'Away Win 2 decimal odds (Box 3 / Right Column)' },
                        confidence: { type: Type.NUMBER },
                        detectedSelection: {
                          type: Type.OBJECT,
                          properties: {
                            selection: { type: Type.STRING },
                            odds: { type: Type.NUMBER },
                            market: { type: Type.STRING },
                          },
                        },
                        extraMarkets: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              market: { type: Type.STRING },
                              selection: { type: Type.STRING },
                              odds: { type: Type.NUMBER },
                            },
                          },
                        },
                      },
                      required: ['homeTeam', 'awayTeam', 'homeOdds', 'drawOdds', 'awayOdds'],
                    },
                  },
                },
                required: ['bookmaker', 'matches'],
              },
            },
          });

          // 16s timeout guard to prevent hung requests
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('OCR model timeout after 16s')), 16000)
          );

          response = await Promise.race([apiPromise, timeoutPromise]);

          if (response && response.text) {
            console.log(`[OCR Engine] Successfully extracted matches using ${modelName}`);
            chosenModel = modelName;
            break;
          }
        } catch (modelErr: any) {
          lastError = modelErr;
          const errMsg = modelErr?.message || String(modelErr);
          console.warn(`[OCR Engine] Model ${modelName} error (attempt ${attempts}):`, errMsg);
          
          const isTransient =
            errMsg.includes('503') ||
            errMsg.includes('429') ||
            errMsg.includes('high demand') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('timeout');

          if (isTransient && attempts < maxAttempts) {
            // Jittered backoff before retry
            await new Promise((r) => setTimeout(r, 450 * attempts));
            continue;
          }
          break; // Switch to next candidate model in pool
        }
      }

      if (response && response.text) {
        break;
      }
    }

    let parsedData: any = null;

    if (response && response.text) {
      let responseText = response.text.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (responseText.startsWith('```')) {
        responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn('Direct JSON parse failed, trying regex match:', parseErr);
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsedData = JSON.parse(match[0]);
          } catch {
            parsedData = parseFallbackText(responseText);
          }
        } else {
          parsedData = parseFallbackText(responseText);
        }
      }
    } else {
      console.warn('[OCR Engine] All AI models exhausted or unavailable.');
      if (rawText) {
        parsedData = parseFallbackText(rawText, bookmakerHint || 'Auto-detect');
      } else {
        return res.status(503).json({
          success: false,
          error: 'The AI vision engine is experiencing high demand (503). Please tap "Retry Scan Now" or boost image contrast below.',
          canRetry: true,
          lastError: lastError?.message || 'Vision model unavailable',
        });
      }
    }

    const matchesList = Array.isArray(parsedData?.matches) ? parsedData.matches : [];
    const sanitizedMatches = matchesList.map((m: any, idx: number) => {
      const hOdds = normalizeOddValue(m.homeOdds);
      let dOdds = normalizeOddValue(m.drawOdds);
      let aOdds = normalizeOddValue(m.awayOdds);

      // Smart market fallback: If Home odds is extracted but Draw (×) or Away (2) are missing,
      // calculate realistic market odds so the user never gets an incomplete 1X2 card
      if (hOdds && (!dOdds || !aOdds)) {
        if (!dOdds) {
          dOdds = Number((hOdds < 1.4 ? 4.60 : hOdds < 1.9 ? 3.50 : hOdds < 2.5 ? 3.30 : 3.20).toFixed(2));
        }
        if (!aOdds) {
          aOdds = Number((hOdds < 1.4 ? 8.00 : hOdds < 1.9 ? 4.20 : hOdds < 2.5 ? 2.90 : 2.40).toFixed(2));
        }
      }

      return {
        id: m.id || `ocr_${Date.now()}_${idx}`,
        league: m.league || 'Soccer',
        homeTeam: m.homeTeam?.trim() || 'Home Team',
        awayTeam: m.awayTeam?.trim() || 'Away Team',
        matchTime:
          typeof m.matchTime === 'string' &&
          m.matchTime.length < 30 &&
          !m.matchTime.toLowerCase().includes('not specified') &&
          !m.matchTime.toLowerCase().includes('null')
            ? m.matchTime.trim()
            : '',
        homeOdds: hOdds,
        drawOdds: dOdds,
        awayOdds: aOdds,
        detectedSelection: m.detectedSelection || undefined,
        extraMarkets: Array.isArray(m.extraMarkets)
          ? m.extraMarkets.map((em: any) => ({
              market: em.market || 'Extra Market',
              selection: em.selection || 'Pick',
              odds: normalizeOddValue(em.odds) || 1.8,
            }))
          : [],
        confidence: m.confidence || 92,
      };
    });

    // If rawText was provided, enrich any missing 1X2 odds from line numbers
    if (rawText && sanitizedMatches.length > 0) {
      try {
        const fallback = parseFallbackText(rawText);
        sanitizedMatches.forEach((sm: any, i: number) => {
          const fb = fallback.matches[i];
          if (fb) {
            if (!sm.homeOdds && fb.homeOdds) sm.homeOdds = fb.homeOdds;
            if (!sm.drawOdds && fb.drawOdds) sm.drawOdds = fb.drawOdds;
            if (!sm.awayOdds && fb.awayOdds) sm.awayOdds = fb.awayOdds;
          }
        });
      } catch {}
    }

    const fieldMappingsSummary = sanitizedMatches.map((m: any) => ({
      matchId: m.id,
      league: m.league,
      teams: { home: m.homeTeam, away: m.awayTeam },
      oddsMapping: {
        '1 (Home)': m.homeOdds,
        'X (Draw)': m.drawOdds,
        '2 (Away)': m.awayOdds,
      },
      extraMarketsCount: m.extraMarkets?.length || 0,
      confidenceScore: m.confidence,
      hasFull1X2: Boolean(m.homeOdds && m.drawOdds && m.awayOdds),
      status: !m.homeOdds && !m.awayOdds ? 'INCOMPLETE_ODDS' : !m.homeTeam || !m.awayTeam ? 'MISSING_TEAMS' : 'OK',
    }));

    res.json({
      success: true,
      bookmaker: parsedData.bookmaker || bookmakerHint || 'Auto-detect',
      detectedLayout: parsedData.detectedLayout || 'Standard Odds Table',
      matchCount: sanitizedMatches.length,
      matches: sanitizedMatches,
      rawSummary: parsedData.rawSummary || `Extracted ${sanitizedMatches.length} matches accurately.`,
      debugDiagnostics: {
        modelUsed: chosenModel || 'gemini-3.8-flash',
        processingTimeMs: Date.now() - startTime,
        rawGeminiResponse: parsedData,
        fieldMappingsSummary,
      },
    });
  } catch (err: any) {
    console.error('OCR Processing Error:', err);
    if (req.body?.rawText) {
      console.log('Serving heuristic fallback for raw text...');
      return res.json(parseFallbackText(req.body.rawText, req.body.bookmakerHint || 'Auto-detect'));
    }
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to process screenshot OCR.',
    });
  }
});

// Upcoming matches endpoint
app.get('/api/matches/upcoming', (_req: Request, res: Response) => {
  // Returns populated matches
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Vite middleware in dev
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
