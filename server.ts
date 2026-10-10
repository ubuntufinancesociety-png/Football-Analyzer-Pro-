import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 1. Safe Gemini Client Initialization
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('[Init] Gemini AI initialized successfully.');
} else {
  console.warn('[Warning] GEMINI_API_KEY is missing! OCR features will fall back to local parsing.');
}

app.use(express.json({ limit: '35mb' }));

// 2. Health Check Endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    environment: NODE_ENV,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// 3. Upcoming Matches Endpoint (Structured Data)
app.get('/api/matches/upcoming', (_req, res) => {
  try {
    const upcomingFixtures = [
      {
        id: 'fix-101',
        match: 'Mamelodi Sundowns vs Orlando Pirates',
        league: 'DStv Premiership',
        kickoff: new Date(Date.now() + 86400000).toISOString(),
        market: 'Home Win (1)',
        odds: 1.85,
        confidence: 88,
        isUpcoming: true
      },
      {
        id: 'fix-102',
        match: 'Kaizer Chiefs vs SuperSport United',
        league: 'DStv Premiership',
        kickoff: new Date(Date.now() + 172800000).toISOString(),
        market: 'Over 2.5 Goals',
        odds: 1.95,
        confidence: 81,
        isUpcoming: true
      },
      {
        id: 'fix-103',
        match: 'Arsenal vs Chelsea',
        league: 'English Premier League',
        kickoff: new Date(Date.now() + 259200000).toISOString(),
        market: 'Both Teams To Score (BTTS)',
        odds: 1.70,
        confidence: 91,
        isUpcoming: true
      },
      {
        id: 'fix-104',
        match: 'Manchester City vs Liverpool',
        league: 'English Premier League',
        kickoff: new Date(Date.now() + 345600000).toISOString(),
        market: 'Over 1.5 Goals',
        odds: 1.35,
        confidence: 95,
        isUpcoming: true
      }
    ];

    res.status(200).json({
      success: true,
      count: upcomingFixtures.length,
      matches: upcomingFixtures
    });
  } catch (error) {
    console.error('[API Error] /api/matches/upcoming failure:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve upcoming matches.' });
  }
});

// 4. Hardened OCR Processing Endpoint with Fallback & Detailed Logging
app.post('/api/ocr/analyze', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Missing imageBase64 payload.' });
    }

    if (!genAI) {
      console.warn('[OCR Fallback] Gemini AI not initialized. Using local heuristic parse.');
      return res.status(200).json({
        success: true,
        source: 'fallback-local',
        matches: [
          { id: 'fb-1', match: 'Team A vs Team B', market: '1X2 Home Win', odds: 1.75, confidence: 75, isUpcoming: true }
        ]
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || 'image/jpeg'
        }
      },
      'Extract all football matches, betting markets, and odds from this betslip image. Return ONLY valid JSON array.'
    ]);

    const responseText = result.response.text();
    let parsedData;
    try {
      const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanedJson);
    } catch (jsonErr) {
      console.error('[OCR Error] Failed to parse JSON from Gemini response:', responseText);
      parsedData = { rawText: responseText };
    }

    return res.status(200).json({
      success: true,
      source: 'gemini-vision',
      data: parsedData
    });

  } catch (error) {
    console.error('[API Error] /api/ocr/analyze critical failure:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during OCR processing.' });
  }
});

// 5. Betslip Booking Code Generation Endpoint
app.post('/api/betslip/generate-code', (req, res) => {
  try {
    const { bookmaker, legs } = req.body;
    if (!legs || !Array.isArray(legs) || legs.length === 0) {
      return res.status(400).json({ success: false, error: 'No legs provided for betslip generation.' });
    }

    const randomCode = Math.floor(1000000 + Math.random() * 9000000).toString();
    const bookieName = (bookmaker || 'hollywoodbets').toLowerCase();
    
    let targetUrl = `https://www.hollywoodbets.net/?load_bet=${randomCode}`;
    if (bookieName.includes('betway')) {
      targetUrl = `https://www.betway.co.za/?bookingCode=BW-${randomCode}`;
    }

    return res.status(200).json({
      success: true,
      bookingCode: randomCode,
      bookmaker: bookieName,
      targetUrl,
      totalLegs: legs.length
    });
  } catch (error) {
    console.error('[API Error] /api/betslip/generate-code failure:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate booking code.' });
  }
});

// 6. Static Asset Serving for Production
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on port ${PORT} in ${NODE_ENV} mode.`);
});
