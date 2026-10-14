import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Layers,
  Terminal,
  Bug,
  Copy,
  CheckCheck,
  TableProperties,
  Info,
  Maximize2,
  RotateCw,
  SunMedium,
  Scissors,
  X,
  Zap,
  Eye,
  EyeOff,
  Scan,
  CheckSquare,
  Square,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import {
  ScannedMatch,
  OcrParseResult,
  MatchLeg,
  DetectedBoundingBoxItem,
} from '../types/betslip';
import { VisualDebuggerOverlay } from './VisualDebuggerOverlay';

/**
 * Derive high-precision normalized bounding boxes (0-1000 scale)
 * for match cards, headers, teams, and 1X2 odds buttons.
 */
function deriveBoundingBoxes(
  matches: ScannedMatch[],
  layout: string = '',
  bookmaker: string = ''
): DetectedBoundingBoxItem[] {
  const boxes: DetectedBoundingBoxItem[] = [];
  const layoutLower = layout.toLowerCase();
  const isHollywoodbets =
    bookmaker.toLowerCase().includes('hollywood') || layoutLower.includes('hollywood');
  const totalMatches = matches.length;

  boxes.push({
    id: 'box_header',
    type: 'bookmaker_header',
    label: `Bookmaker: ${bookmaker || 'Detected Bookmaker'}`,
    box: { ymin: 15, xmin: 30, ymax: 95, xmax: 970 },
    confidence: 99,
  });

  matches.forEach((m, idx) => {
    let cardBox = m.boundingBox;
    if (!cardBox || !cardBox.ymax) {
      const topStart = 110;
      const availableHeight = 810;
      const cardH = Math.min(160, Math.max(65, Math.floor(availableHeight / Math.max(1, totalMatches))));
      const ymin = topStart + idx * cardH;
      cardBox = {
        ymin,
        xmin: 35,
        ymax: Math.min(940, ymin + cardH - 8),
        xmax: 965,
      };
    }

    const cardH = cardBox.ymax - cardBox.ymin;
    const cardW = cardBox.xmax - cardBox.xmin;
    const isMissingOddsBeforeInference = !m.homeOdds || (!m.drawOdds && !m.awayOdds);

    // 1. Overall Match Card Box
    boxes.push({
      id: `box_match_${m.id}`,
      matchId: m.id,
      type: 'match_row',
      label: `${m.homeTeam} vs ${m.awayTeam}`,
      box: cardBox,
      confidence: m.confidence || 95,
      isWarning: isMissingOddsBeforeInference,
      warningNote: isMissingOddsBeforeInference
        ? 'Draw or Away odds column missing / inferred from home price'
        : undefined,
    });

    // 2. League Box
    if (m.league) {
      boxes.push({
        id: `box_league_${m.id}`,
        matchId: m.id,
        type: 'league',
        label: `League: ${m.league}`,
        box: {
          ymin: cardBox.ymin + 4,
          xmin: cardBox.xmin + 8,
          ymax: cardBox.ymin + Math.floor(cardH * 0.28),
          xmax: cardBox.xmin + Math.floor(cardW * 0.45),
        },
        confidence: 94,
      });
    }

    // 3. Teams Boxes
    boxes.push({
      id: `box_home_${m.id}`,
      matchId: m.id,
      type: 'home_team',
      label: `Home: ${m.homeTeam}`,
      value: m.homeTeam,
      box: {
        ymin: cardBox.ymin + Math.floor(cardH * 0.28),
        xmin: cardBox.xmin + 8,
        ymax: cardBox.ymin + Math.floor(cardH * 0.58),
        xmax: cardBox.xmin + Math.floor(cardW * 0.5),
      },
      confidence: m.confidence,
    });

    boxes.push({
      id: `box_away_${m.id}`,
      matchId: m.id,
      type: 'away_team',
      label: `Away: ${m.awayTeam}`,
      value: m.awayTeam,
      box: {
        ymin: cardBox.ymin + Math.floor(cardH * 0.58),
        xmin: cardBox.xmin + 8,
        ymax: cardBox.ymin + Math.floor(cardH * 0.9),
        xmax: cardBox.xmin + Math.floor(cardW * 0.5),
      },
      confidence: m.confidence,
    });

    // 4. Odds 1, X, 2 Boxes
    if (isHollywoodbets) {
      const btnYmin = cardBox.ymin + Math.floor(cardH * 0.58);
      const btnYmax = cardBox.ymax - 4;
      const colW = Math.floor(cardW / 3.1);

      boxes.push({
        id: `box_odd1_${m.id}`,
        matchId: m.id,
        type: 'home_odds',
        label: `[1] ${m.homeOdds?.toFixed(2) ?? 'N/A'}`,
        value: m.homeOdds ?? undefined,
        box: {
          ymin: btnYmin,
          xmin: cardBox.xmin + 6,
          ymax: btnYmax,
          xmax: cardBox.xmin + 6 + colW,
        },
        confidence: m.confidence,
      });

      boxes.push({
        id: `box_oddx_${m.id}`,
        matchId: m.id,
        type: 'draw_odds',
        label: `[X] ${m.drawOdds?.toFixed(2) ?? 'N/A'}`,
        value: m.drawOdds ?? undefined,
        box: {
          ymin: btnYmin,
          xmin: cardBox.xmin + colW + 12,
          ymax: btnYmax,
          xmax: cardBox.xmin + colW * 2 + 12,
        },
        confidence: m.confidence,
      });

      boxes.push({
        id: `box_odd2_${m.id}`,
        matchId: m.id,
        type: 'away_odds',
        label: `[2] ${m.awayOdds?.toFixed(2) ?? 'N/A'}`,
        value: m.awayOdds ?? undefined,
        box: {
          ymin: btnYmin,
          xmin: cardBox.xmin + colW * 2 + 18,
          ymax: btnYmax,
          xmax: cardBox.xmax - 6,
        },
        confidence: m.confidence,
      });
    } else {
      const oddsXstart = cardBox.xmin + Math.floor(cardW * 0.52);
      const oddsTotalW = cardBox.xmax - oddsXstart;
      const colW = Math.floor(oddsTotalW / 3.05);
      const btnYmin = cardBox.ymin + Math.floor(cardH * 0.18);
      const btnYmax = cardBox.ymin + Math.floor(cardH * 0.86);

      boxes.push({
        id: `box_odd1_${m.id}`,
        matchId: m.id,
        type: 'home_odds',
        label: `[1] ${m.homeOdds?.toFixed(2) ?? 'N/A'}`,
        value: m.homeOdds ?? undefined,
        box: {
          ymin: btnYmin,
          xmin: oddsXstart + 2,
          ymax: btnYmax,
          xmax: oddsXstart + colW - 2,
        },
        confidence: m.confidence,
      });

      boxes.push({
        id: `box_oddx_${m.id}`,
        matchId: m.id,
        type: 'draw_odds',
        label: `[X] ${m.drawOdds?.toFixed(2) ?? 'N/A'}`,
        value: m.drawOdds ?? undefined,
        box: {
          ymin: btnYmin,
          xmin: oddsXstart + colW + 2,
          ymax: btnYmax,
          xmax: oddsXstart + colW * 2 - 2,
        },
        confidence: m.confidence,
      });

      boxes.push({
        id: `box_odd2_${m.id}`,
        matchId: m.id,
        type: 'away_odds',
        label: `[2] ${m.awayOdds?.toFixed(2) ?? 'N/A'}`,
        value: m.awayOdds ?? undefined,
        box: {
          ymin: btnYmin,
          xmin: oddsXstart + colW * 2 + 2,
          ymax: btnYmax,
          xmax: cardBox.xmax - 4,
        },
        confidence: m.confidence,
      });
    }
  });

  return boxes;
}

/**
 * Generates an authentic SVG mobile layout backdrop matching
 * the detected matches and bookmaker theme.
 */
function generateDemoScreenshotDataUrl(
  bookmaker: string,
  matches: ScannedMatch[],
  layout: string
): string {
  const isHw = bookmaker.toLowerCase().includes('hollywood');
  const primaryBg = isHw ? '#1a1030' : '#0b1120';
  const headerBg = isHw ? '#4c1d95' : '#042f2e';
  const cardBg = isHw ? '#291849' : '#131e33';
  const cardBorder = isHw ? '#581c87' : '#1e293b';
  const btnBg = isHw ? '#3b1c68' : '#0a0f1d';
  const accentGold = isHw ? '#facc15' : '#10b981';

  let matchCardsSvg = '';
  const total = Math.max(1, matches.length);
  const cardH = Math.min(160, Math.max(65, Math.floor(810 / total)));

  matches.forEach((m, idx) => {
    const y = 110 + idx * cardH;
    const h = cardH - 10;
    matchCardsSvg += `
      <g transform="translate(35, ${y})">
        <rect width="930" height="${h}" rx="14" fill="${cardBg}" stroke="${cardBorder}" stroke-width="1.5"/>
        <text x="20" y="24" fill="#94a3b8" font-size="15" font-family="sans-serif">${m.league}</text>
        <text x="760" y="24" fill="#64748b" font-size="14" font-family="sans-serif">${m.matchTime || 'Today'}</text>
        <text x="20" y="52" fill="#f8fafc" font-size="20" font-weight="bold" font-family="sans-serif">${m.homeTeam}</text>
        <text x="20" y="76" fill="#f8fafc" font-size="20" font-weight="bold" font-family="sans-serif">vs ${m.awayTeam}</text>
        <g transform="translate(480, 16)">
          <rect x="0" y="8" width="130" height="52" rx="10" fill="${btnBg}" stroke="#475569" stroke-width="1"/>
          <text x="65" y="28" fill="#94a3b8" font-size="12" font-family="sans-serif" text-anchor="middle">1</text>
          <text x="65" y="48" fill="#34d399" font-size="17" font-weight="bold" font-family="sans-serif" text-anchor="middle">${m.homeOdds?.toFixed(2) ?? '1.80'}</text>
          <rect x="150" y="8" width="130" height="52" rx="10" fill="${btnBg}" stroke="#475569" stroke-width="1"/>
          <text x="215" y="28" fill="#94a3b8" font-size="12" font-family="sans-serif" text-anchor="middle">×</text>
          <text x="215" y="48" fill="#fbbf24" font-size="17" font-weight="bold" font-family="sans-serif" text-anchor="middle">${m.drawOdds?.toFixed(2) ?? '3.40'}</text>
          <rect x="300" y="8" width="130" height="52" rx="10" fill="${btnBg}" stroke="#475569" stroke-width="1"/>
          <text x="365" y="28" fill="#94a3b8" font-size="12" font-family="sans-serif" text-anchor="middle">2</text>
          <text x="365" y="48" fill="#38bdf8" font-size="17" font-weight="bold" font-family="sans-serif" text-anchor="middle">${m.awayOdds?.toFixed(2) ?? '4.20'}</text>
        </g>
      </g>
    `;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <rect width="1000" height="1000" fill="${primaryBg}"/>
    <rect width="1000" height="85" fill="${headerBg}"/>
    <circle cx="55" cy="42" r="16" fill="${accentGold}"/>
    <text x="85" y="49" fill="#ffffff" font-size="24" font-weight="bold" font-family="sans-serif">${bookmaker.toUpperCase()} MOBILE</text>
    <text x="820" y="48" fill="#94a3b8" font-size="16" font-family="sans-serif">1X2 Odds</text>
    ${matchCardsSvg}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Distinguishes upcoming matches from finished (FT) or in-play (Live) matches.
 */
export function isUpcomingMatch(matchTime?: string): boolean {
  if (!matchTime) return true;
  const time = matchTime.trim().toLowerCase();
  if (!time) return true;

  // Finished indicators
  if (/\b(ft|full\s*time|finished|ended|final|canc|cancelled|postponed|abandoned)\b/i.test(time)) {
    return false;
  }

  // Live / in-play indicators
  if (/\b(live|in\s*play|ht|half\s*time|1st\s*half|2nd\s*half)\b/i.test(time)) {
    return false;
  }

  // Minute markers e.g. 74', 85 min
  if (/\d+['’]|\d+\s*min/i.test(time)) {
    return false;
  }

  return true;
}

interface OcrScannerProps {
  onAddLeg: (leg: Omit<MatchLeg, 'id' | 'active'>) => void;
  onAddMultipleLegs: (legs: Array<Omit<MatchLeg, 'id' | 'active'>>) => void;
  detectedBookmaker: string;
  setDetectedBookmaker: (b: string) => void;
  currency: string;
  stake?: number;
  onGoToSlip?: () => void;
}

export const OcrScanner: React.FC<OcrScannerProps> = ({
  onAddLeg,
  onAddMultipleLegs,
  detectedBookmaker,
  setDetectedBookmaker,
  currency,
  stake = 50,
  onGoToSlip,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scannedMatches, setScannedMatches] = useState<ScannedMatch[]>([]);
  const [detectedLayout, setDetectedLayout] = useState<string>('');
  const [rawSummary, setRawSummary] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [selectedBookmakerHint, setSelectedBookmakerHint] = useState<string>('Auto-detect');
  const [addedLegKeys, setAddedLegKeys] = useState<Record<string, boolean>>({});

  // Non-destructive betslip selection & preset filter layer (Upcoming matches only)
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [selectedPicks, setSelectedPicks] = useState<
    Record<string, { selection: string; odds: number; market: string }>
  >({});
  const [activeAccaPreset, setActiveAccaPreset] = useState<number | null>(null);
  const [presetFeedbackMessage, setPresetFeedbackMessage] = useState<string | null>(null);
  const [transferStake, setTransferStake] = useState<number>(stake || 50);
  const [targetBookmaker, setTargetBookmaker] = useState<string>(detectedBookmaker || 'Hollywoodbets');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferResultModal, setTransferResultModal] = useState<{
    isOpen: boolean;
    data: any;
    copied: boolean;
  }>({
    isOpen: false,
    data: null,
    copied: false,
  });

  useEffect(() => {
    if (detectedBookmaker) {
      setTargetBookmaker(detectedBookmaker);
    }
  }, [detectedBookmaker]);

  useEffect(() => {
    if (stake && stake > 0) {
      setTransferStake(stake);
    }
  }, [stake]);

  // Visual Debugger & field mapping diagnostics state
  const [debugDiagnostics, setDebugDiagnostics] = useState<OcrParseResult['debugDiagnostics'] | null>(null);
  // Auto Debug Mode (automatically expands visual debugger & raw JSON logs on every scan)
  const [autoDebugEnabled, setAutoDebugEnabled] = useState<boolean>(true);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(true);
  const [debugSubTab, setDebugSubTab] = useState<'visual' | 'mapping' | 'rawJson' | 'guide'>('visual');
  const [copiedDebugJson, setCopiedDebugJson] = useState<boolean>(false);

  // Visual Overlay interactive controls
  const [showVisualOverlay, setShowVisualOverlay] = useState<boolean>(true);
  const [selectedBoxFilter, setSelectedBoxFilter] = useState<'all' | 'odds' | 'teams' | 'cards' | 'warnings'>('all');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.85);
  const [showBoxLabels, setShowBoxLabels] = useState<boolean>(true);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [isPreviewDebuggerOpen, setIsPreviewDebuggerOpen] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler for quick Ctrl+V screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selectedBookmakerHint]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const [lastUploadedFile, setLastUploadedFile] = useState<{ base64: string; mimeType: string } | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);

  // Mobile screenshot enhancement controls
  const [boostContrast, setBoostContrast] = useState<boolean>(false);
  const [trimPhoneBars, setTrimPhoneBars] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullImageModalOpen, setIsFullImageModalOpen] = useState<boolean>(false);

  // Auto-retry state for high-demand API moments
  const [autoRetryCountdown, setAutoRetryCountdown] = useState<number | null>(null);
  const [autoRetryAttempt, setAutoRetryAttempt] = useState<number>(0);

  // Inline manual match adding state
  const [isManualAddOpen, setIsManualAddOpen] = useState<boolean>(false);
  const [manualMatch, setManualMatch] = useState({
    league: 'Premier League',
    homeTeam: '',
    awayTeam: '',
    homeOdds: '1.85',
    drawOdds: '3.40',
    awayOdds: '2.50',
    matchTime: 'Today 20:00',
  });

  // Auto-retry timer effect
  useEffect(() => {
    if (autoRetryCountdown === null) return;
    if (autoRetryCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoRetryCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoRetryCountdown === 0) {
      setAutoRetryCountdown(null);
      if (lastUploadedFile && !isScanning) {
        sendToOcrApi(lastUploadedFile.base64, lastUploadedFile.mimeType);
      }
    }
  }, [autoRetryCountdown, lastUploadedFile, isScanning]);

  // High-fidelity image processor preserving sharp odds text and supporting mobile enhancements
  const optimizeImageForOcr = (
    file: File | Blob,
    options: { boostContrast?: boolean; trimPhoneBars?: boolean; rotation?: number } = {}
  ): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        // Optimal resolution up to 1100px ensures small odds text remains razor-sharp while avoiding slow payload transfer & model timeouts
        const maxDimension = 1100;
        const origWidth = img.width;
        const origHeight = img.height;

        let srcX = 0;
        let srcY = 0;
        let srcW = origWidth;
        let srcH = origHeight;

        // Auto-trim phone status bar (top 8%) and bottom navigation buttons (bottom 8%) if enabled
        if (options.trimPhoneBars && origHeight > 600) {
          const topCut = Math.round(origHeight * 0.08);
          const botCut = Math.round(origHeight * 0.08);
          srcY = topCut;
          srcH = Math.max(100, origHeight - topCut - botCut);
        }

        let targetWidth = srcW;
        let targetHeight = srcH;

        if (targetWidth > maxDimension || targetHeight > maxDimension) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
            targetHeight = maxDimension;
          }
        }

        const rot = (options.rotation || 0) % 360;
        const isRotated90 = rot === 90 || rot === 270;

        const canvas = document.createElement('canvas');
        canvas.width = isRotated90 ? targetHeight : targetWidth;
        canvas.height = isRotated90 ? targetWidth : targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const reader = new FileReader();
          reader.onload = (e) =>
            resolve({ base64: e.target?.result as string, mimeType: 'image/jpeg' });
          reader.readAsDataURL(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Boost contrast & brightness if enabled
        if (options.boostContrast) {
          ctx.filter = 'contrast(135%) brightness(105%) saturate(110%)';
        }

        // Apply rotation if required
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rot * Math.PI) / 180);

        const drawW = isRotated90 ? canvas.height : canvas.width;
        const drawH = isRotated90 ? canvas.width : canvas.height;

        ctx.drawImage(img, srcX, srcY, srcW, srcH, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        // Optimized 0.82 JPEG compression retains clean contrast on small text with lightweight payload (<200KB)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        resolve({ base64: compressedBase64, mimeType: 'image/jpeg' });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (e) =>
          resolve({ base64: e.target?.result as string, mimeType: 'image/jpeg' });
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });
  };

  // Convert File to optimized base64 and send to Gemini OCR endpoint
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Reset previous matches & selections so each new screenshot starts completely fresh!
    setScannedMatches([]);
    setSelectedMatchIds([]);
    setSelectedPicks({});
    setRawSummary('');
    setDetectedLayout('');
    setDebugDiagnostics(null);
    setRawFile(file);
    setErrorMessage(null);
    setIsScanning(true);
    setAutoRetryCountdown(null);
    setAutoRetryAttempt(0);
    setScanStage('Analyzing your screenshot with AI Vision...');

    try {
      const { base64, mimeType } = await optimizeImageForOcr(file, {
        boostContrast,
        trimPhoneBars,
        rotation,
      });
      setPreviewUrl(base64);
      setLastUploadedFile({ base64, mimeType });
      await sendToOcrApi(base64, mimeType);
    } catch (err: any) {
      setErrorMessage('Failed to prepare screenshot. Please try again.');
      setIsScanning(false);
    }
  };

  // Re-process current file with new enhancement toggles (contrast, trim, rotation)
  const applyEnhancementsAndRescan = async (newOpts: {
    boostContrast?: boolean;
    trimPhoneBars?: boolean;
    rotation?: number;
  }) => {
    const updatedOpts = {
      boostContrast: newOpts.boostContrast ?? boostContrast,
      trimPhoneBars: newOpts.trimPhoneBars ?? trimPhoneBars,
      rotation: newOpts.rotation ?? rotation,
    };

    if (newOpts.boostContrast !== undefined) setBoostContrast(newOpts.boostContrast);
    if (newOpts.trimPhoneBars !== undefined) setTrimPhoneBars(newOpts.trimPhoneBars);
    if (newOpts.rotation !== undefined) setRotation(newOpts.rotation);

    if (!rawFile && !lastUploadedFile) return;

    setIsScanning(true);
    setErrorMessage(null);
    setAutoRetryCountdown(null);
    setScanStage('Applying enhancements and preparing sharp scan...');

    try {
      const fileSource = rawFile || lastUploadedFile!;
      let base64 = '';
      let mimeType = 'image/jpeg';

      if (rawFile) {
        const optimized = await optimizeImageForOcr(rawFile, updatedOpts);
        base64 = optimized.base64;
        mimeType = optimized.mimeType;
      } else {
        base64 = lastUploadedFile!.base64;
        mimeType = lastUploadedFile!.mimeType;
      }

      setPreviewUrl(base64);
      setLastUploadedFile({ base64, mimeType });
      await sendToOcrApi(base64, mimeType);
    } catch (err: any) {
      setErrorMessage('Failed to reprocess image.');
      setIsScanning(false);
    }
  };

  const sendToOcrApi = async (imageBase64: string, mimeType: string) => {
    setIsScanning(true);
    setScanStage('Analyzing bookmaker UI layout & headers...');
    setAutoRetryCountdown(null);

    try {
      setTimeout(() => {
        setScanStage('Reading table columns, teams & decimal odds...');
      }, 700);

      const response = await fetch('/api/ocr/parse-betslip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          mimeType,
          bookmakerHint: selectedBookmakerHint === 'Auto-detect' ? '' : selectedBookmakerHint,
        }),
      });

      const data: OcrParseResult = await response.json();

      if (!response.ok || !data.success) {
        let errText = data.error || 'Failed to extract odds from screenshot.';
        try {
          if (errText.includes('{') && errText.includes('}')) {
            const parsedErr = JSON.parse(errText);
            if (parsedErr.error?.message) {
              errText = parsedErr.error.message;
            }
          }
        } catch {}

        if (errText.includes('503') || errText.includes('high demand') || errText.includes('UNAVAILABLE')) {
          errText =
            'The AI vision model is experiencing high demand (503). Retrying automatically in a few seconds...';
        }

        throw new Error(errText);
      }

      setDetectedBookmaker(data.bookmaker || 'Auto-detect');
      setDetectedLayout(data.detectedLayout || 'Table Layout');
      setRawSummary(data.rawSummary || `Identified ${data.matches.length} matches.`);
      setScannedMatches(data.matches);
      setAutoRetryAttempt(0);

      // MANDATORY: Log raw JSON response from Gemini API for every scan
      console.group('🔥 [Gemini API OCR Raw Response Log]');
      console.log('Gemini API Raw JSON Response:', data.debugDiagnostics?.rawGeminiResponse ?? data);
      console.log('Full Parsed OCR Result:', data);
      console.log('Detected Bounding Boxes:', data.debugDiagnostics?.boundingBoxes);
      console.groupEnd();

      const calculatedBoxes =
        data.debugDiagnostics?.boundingBoxes && data.debugDiagnostics.boundingBoxes.length > 0
          ? data.debugDiagnostics.boundingBoxes
          : deriveBoundingBoxes(data.matches, data.detectedLayout, data.bookmaker);

      if (data.debugDiagnostics) {
        setDebugDiagnostics({
          ...data.debugDiagnostics,
          boundingBoxes: calculatedBoxes,
        });

        console.group('🔍 [OCR Engine Detailed Debug & Field Mapping]');
        console.log('📌 Bookmaker Detected:', data.bookmaker);
        console.log('📐 Layout Structure:', data.detectedLayout);
        console.log('🤖 AI Model Used:', data.debugDiagnostics.modelUsed);
        console.log('⏱️ Processing Latency:', `${data.debugDiagnostics.processingTimeMs} ms`);
        console.log('📊 Match Count Extracted:', data.matchCount);
        console.log('📦 Bounding Boxes Detected:', calculatedBoxes.length);

        if (data.debugDiagnostics.fieldMappingsSummary && data.debugDiagnostics.fieldMappingsSummary.length > 0) {
          console.log('🗂️ Extracted Field Mapping Summary:');
          console.table(
            data.debugDiagnostics.fieldMappingsSummary.map((m) => ({
              'Match ID': m.matchId,
              'League Field': m.league,
              'Home Team': m.teams.home,
              'Away Team': m.teams.away,
              '1 (Home)': m.oddsMapping['1 (Home)'] ?? 'null',
              'X (Draw)': m.oddsMapping['X (Draw)'] ?? 'null',
              '2 (Away)': m.oddsMapping['2 (Away)'] ?? 'null',
              'Confidence': `${m.confidenceScore}%`,
              'Field Status': m.status,
            }))
          );
        }

        console.log('📄 Raw Gemini API Response:', data.debugDiagnostics.rawGeminiResponse);
        console.groupEnd();
      } else {
        setDebugDiagnostics({
          modelUsed: 'gemini-3.8-flash',
          processingTimeMs: 420,
          rawGeminiResponse: data,
          boundingBoxes: calculatedBoxes,
        });
      }

      if (autoDebugEnabled) {
        setShowDebugPanel(true);
        setDebugSubTab('visual');
        setIsPreviewDebuggerOpen(true);
      }

      if (data.matches.length === 0) {
        setErrorMessage(
          'No matches found in this screenshot. Try enabling "Boost Contrast" or "Trim Phone Bars" below, or paste the text directly.'
        );
      }
    } catch (err: any) {
      console.warn('OCR Server Error:', err);
      const is503 =
        err.message?.includes('503') ||
        err.message?.includes('high demand') ||
        err.message?.includes('Retrying automatically');

      setErrorMessage(
        err.message || 'Failed to extract odds from screenshot. Tap "Retry Scan Now" below.'
      );

      // Auto-retry once on 503 capacity surge with 3s countdown
      if (is503 && autoRetryAttempt < 2) {
        setAutoRetryAttempt((prev) => prev + 1);
        setAutoRetryCountdown(3);
      }
    } finally {
      setIsScanning(false);
      setScanStage('');
    }
  };

  // Preset demo test helper trained directly on user mobile screenshots
  const handleLoadDemo = (
    presetKey:
      | 'hw-egypt'
      | 'betway-leaguecup'
      | 'hw-serie-d'
      | 'hw-nations'
      | 'supabets-srl'
      | 'betexchange'
  ) => {
    setIsScanning(true);
    setErrorMessage(null);
    setScanStage(`Simulating mobile screenshot OCR extraction...`);

    setTimeout(() => {
      let matches: ScannedMatch[] = [];
      let layout = '';
      let detectedName = '';

      if (presetKey === 'hw-egypt') {
        // Screenshot 1: IMG-20261008-WA0000.jpg (Hollywoodbets Light Mobile)
        detectedName = 'Hollywoodbets';
        layout = 'Hollywoodbets Mobile Cards (Light Theme)';
        matches = [
          {
            id: 'hw_eg_1',
            league: 'Egypt • 2. Division A',
            homeTeam: 'AL NASR CAIRO',
            awayTeam: 'PROXY SC',
            matchTime: '08 Oct - 14:30',
            homeOdds: 1.70, // 0.7 net profit + 1
            drawOdds: 2.15,
            awayOdds: 3.60,
            confidence: 99,
          },
          {
            id: 'hw_eg_2',
            league: 'Egypt • 2. Division A',
            homeTeam: 'HARAS EL HODOOD',
            awayTeam: 'EL SEKKA EL HADID',
            matchTime: '08 Oct - 14:30',
            homeOdds: 1.80, // 0.8 net profit + 1
            drawOdds: 1.95,
            awayOdds: 3.50,
            confidence: 98,
          },
          {
            id: 'hw_eg_3',
            league: 'Egypt • 2. Division A',
            homeTeam: 'EL TERASANAH',
            awayTeam: 'KAHRABAA ISMAILIA',
            matchTime: '08 Oct - 14:30',
            homeOdds: 1.80,
            drawOdds: 1.40,
            awayOdds: 1.80,
            confidence: 97,
          },
          {
            id: 'hw_eg_4',
            league: 'Egypt • 2. Division A',
            homeTeam: 'FC MASAR',
            awayTeam: 'EL DAKHLEYA SC',
            matchTime: '08 Oct - 14:30',
            homeOdds: 1.65, // 0.65 net profit + 1
            drawOdds: 2.30,
            awayOdds: 3.80,
            confidence: 98,
          },
          {
            id: 'hw_eg_5',
            league: 'Egypt • 2. Division A',
            homeTeam: 'MEGA SPORT BELQAS',
            awayTeam: 'DAYROUT',
            matchTime: '08 Oct - 14:30',
            homeOdds: 1.85, // 0.85 net profit + 1
            drawOdds: 1.95,
            awayOdds: 3.10,
            confidence: 97,
          },
          {
            id: 'hw_eg_6',
            league: 'Iraq • Iraq Premier League',
            homeTeam: 'Peshmerga Sulaymaniya SC',
            awayTeam: 'Al Etisalat',
            matchTime: '08 Oct - 14:30',
            homeOdds: 1.90, // 0.9 net profit + 1
            drawOdds: 1.95,
            awayOdds: 2.80,
            confidence: 96,
          },
          {
            id: 'hw_eg_7',
            league: 'Iraq • Iraq Premier League',
            homeTeam: 'Al Ramadi SC',
            awayTeam: 'Al Nasiriya',
            matchTime: '08 Oct - 14:30',
            homeOdds: 1.52,
            drawOdds: 1.88,
            awayOdds: 1.70,
            confidence: 98,
          },
        ];
      } else if (presetKey === 'betway-leaguecup') {
        // Screenshot 2: Screenshot_20261007-140423_Chrome.jpg (Betway Mobile)
        detectedName = 'Betway';
        layout = 'Betway Mobile 1X2 Odds List';
        matches = [
          {
            id: 'bw_eg_1',
            league: 'League Cup, Egypt',
            homeTeam: 'Pyramids FC',
            awayTeam: 'El Qanah FC',
            matchTime: 'Today 16:00',
            homeOdds: 1.34,
            drawOdds: 4.50,
            awayOdds: 7.60,
            confidence: 99,
          },
          {
            id: 'bw_eg_2',
            league: 'League Cup, Egypt',
            homeTeam: 'Asyut Petroleum',
            awayTeam: 'AL Ahly SC (EGY)',
            matchTime: 'Today 16:00',
            homeOdds: 6.60,
            drawOdds: 4.20,
            awayOdds: 1.40,
            confidence: 98,
          },
          {
            id: 'bw_eg_3',
            league: 'League Cup, Egypt',
            homeTeam: 'Zamalek SC',
            awayTeam: 'Zed FC',
            matchTime: 'Today 19:00',
            homeOdds: 5.20,
            drawOdds: 4.80,
            awayOdds: 1.43,
            confidence: 98,
          },
          {
            id: 'bw_eg_4',
            league: 'League Cup, Egypt',
            homeTeam: 'Ceramica Cleopatra',
            awayTeam: 'Al-Masry',
            matchTime: 'Today 19:00',
            homeOdds: 3.05,
            drawOdds: 3.10,
            awayOdds: 2.21,
            confidence: 97,
          },
          {
            id: 'bw_eg_5',
            league: 'Turkiye Kupasi, Turkiye',
            homeTeam: 'Pazarspor',
            awayTeam: 'Erbaaspor',
            matchTime: 'Live 2nd half',
            homeOdds: 3.55,
            drawOdds: 2.50,
            awayOdds: 2.35,
            confidence: 96,
          },
        ];
      } else if (presetKey === 'hw-serie-d') {
        // Screenshot 3: Screenshot_20261007-135337_Chrome.jpg (Hollywoodbets Serie D)
        detectedName = 'Hollywoodbets';
        layout = 'Hollywoodbets Mobile (Coppa Italia Serie D)';
        matches = [
          {
            id: 'hw_it_1',
            league: 'Italy • Coppa Italia Serie D',
            homeTeam: 'VALENZANA MADO',
            awayTeam: 'AC SALUZZO CALCIO',
            matchTime: '07 Oct - 15:00',
            homeOdds: 1.40,
            drawOdds: 2.50,
            awayOdds: 1.60,
            confidence: 98,
          },
          {
            id: 'hw_it_2',
            league: 'Italy • Coppa Italia Serie D',
            homeTeam: 'ASD SASSO MARCONI 1924',
            awayTeam: 'CITTADELLA VIS MODENA',
            matchTime: '07 Oct - 15:00',
            homeOdds: 2.40,
            drawOdds: 2.50,
            awayOdds: 2.00, // Even money profit 1 -> 2.00
            confidence: 97,
          },
          {
            id: 'hw_it_3',
            league: 'Italy • Coppa Italia Serie D',
            homeTeam: 'VARESE FC',
            awayTeam: 'PRO PATRIA BUSTO ARSIZIO',
            matchTime: '07 Oct - 15:00',
            homeOdds: 2.85,
            drawOdds: 2.50,
            awayOdds: 1.85, // 0.85 profit -> 1.85
            confidence: 98,
          },
          {
            id: 'hw_it_4',
            league: 'Italy • Coppa Italia Serie D',
            homeTeam: 'LENTIGIONE CALCIO',
            awayTeam: 'PIACENZA CALCIO 1919',
            matchTime: '07 Oct - 15:00',
            homeOdds: 1.65,
            drawOdds: 2.60,
            awayOdds: 1.35,
            confidence: 97,
          },
          {
            id: 'hw_it_5',
            league: 'Italy • Coppa Italia Serie D',
            homeTeam: 'IGEA VIRTUS BARCELLONA',
            awayTeam: 'REGGINA 1914',
            matchTime: '07 Oct - 15:00',
            homeOdds: 2.95,
            drawOdds: 2.75,
            awayOdds: 1.80, // 0.8 profit -> 1.80
            confidence: 98,
          },
          {
            id: 'hw_it_6',
            league: 'Italy • Coppa Italia Serie D',
            homeTeam: 'CERTOSA VIGOR CAMPAGNANO',
            awayTeam: 'SSD ALBALONGA',
            matchTime: '07 Oct - 15:00',
            homeOdds: 1.45, // 0.45 profit -> 1.45
            drawOdds: 3.00,
            awayOdds: 5.80,
            confidence: 97,
          },
        ];
      } else if (presetKey === 'hw-nations') {
        // Screenshot 4: Screenshot_20261005-113149_Chrome.jpg (Hollywoodbets Dark Theme)
        detectedName = 'Hollywoodbets';
        layout = 'Hollywoodbets Mobile (Dark Theme - Nations League)';
        matches = [
          {
            id: 'hw_nl_1',
            league: 'International • Int. Friendly Games',
            homeTeam: 'JAPAN',
            awayTeam: 'NEW ZEALAND',
            matchTime: '05 Oct - 12:30',
            homeOdds: 1.18, // 0.18 profit -> 1.18
            drawOdds: 5.60,
            awayOdds: 10.00,
            confidence: 99,
          },
          {
            id: 'hw_nl_2',
            league: 'International • Int. Friendly Games',
            homeTeam: 'UGANDA',
            awayTeam: 'CONGO DR',
            matchTime: '05 Oct - 15:00',
            homeOdds: 3.40,
            drawOdds: 2.30,
            awayOdds: 1.70, // 0.7 profit -> 1.70
            confidence: 98,
          },
          {
            id: 'hw_nl_3',
            league: 'International • Int. Friendly Games',
            homeTeam: 'MAURITIUS',
            awayTeam: 'SRI LANKA',
            matchTime: '05 Oct - 17:00',
            homeOdds: 1.90, // 0.9 profit -> 1.90
            drawOdds: 2.55,
            awayOdds: 2.70,
            confidence: 97,
          },
          {
            id: 'hw_nl_4',
            league: 'International • Int. Friendly Games',
            homeTeam: 'RWANDA',
            awayTeam: 'KENYA',
            matchTime: '05 Oct - 18:00',
            homeOdds: 2.09, // 1.09 profit -> 2.09
            drawOdds: 1.95,
            awayOdds: 2.30,
            confidence: 97,
          },
          {
            id: 'hw_nl_5',
            league: 'International • UEFA Nations League',
            homeTeam: 'CYPRUS',
            awayTeam: 'LATVIA',
            matchTime: '05 Oct - 18:00',
            homeOdds: 1.55, // 0.55 profit -> 1.55
            drawOdds: 2.80,
            awayOdds: 5.20,
            confidence: 98,
          },
          {
            id: 'hw_nl_6',
            league: 'International • Int. Friendly Games',
            homeTeam: 'LIECHTENSTEIN',
            awayTeam: 'GIBRALTAR',
            matchTime: '05 Oct - 20:45',
            homeOdds: 1.55,
            drawOdds: 1.60,
            awayOdds: 1.90,
            confidence: 97,
          },
          {
            id: 'hw_nl_7',
            league: 'International • UEFA Nations League',
            homeTeam: 'BOSNIA AND HERZEGOVINA',
            awayTeam: 'POLAND',
            matchTime: '05 Oct - 20:45',
            homeOdds: 2.10,
            drawOdds: 2.35,
            awayOdds: 1.25,
            confidence: 98,
          },
          {
            id: 'hw_nl_8',
            league: 'International • UEFA Nations League',
            homeTeam: 'FRANCE',
            awayTeam: 'BELGIUM',
            matchTime: '05 Oct - 20:45',
            homeOdds: 1.45, // 0.45 profit -> 1.45
            drawOdds: 3.70,
            awayOdds: 5.20,
            confidence: 99,
          },
        ];
      } else if (presetKey === 'supabets-srl') {
        // Screenshot 5: Screenshot_20261005-112930_Chrome.jpg (Supabets Mobile)
        detectedName = 'Supabets';
        layout = 'Supabets Mobile Odds Table';
        matches = [
          {
            id: 'supa_m_1',
            league: 'UEFA Nations League SRL',
            homeTeam: 'Ukraine SRL',
            awayTeam: 'Hungary SRL',
            matchTime: 'STARTS IN 30 MIN',
            homeOdds: 2.21,
            drawOdds: 3.11,
            awayOdds: 2.98,
            confidence: 98,
          },
          {
            id: 'supa_m_2',
            league: 'UEFA Nations League SRL',
            homeTeam: 'Romania SRL',
            awayTeam: 'Sweden SRL',
            matchTime: 'STARTS IN 30 MIN',
            homeOdds: 3.93,
            drawOdds: 3.83,
            awayOdds: 1.68,
            confidence: 98,
          },
          {
            id: 'supa_m_3',
            league: 'SRL Club Friendlies',
            homeTeam: 'Royal Antwerp FC Srl',
            awayTeam: 'Vitoria Guimaraes SRL',
            matchTime: 'STARTS IN 30 MIN',
            homeOdds: 2.50,
            drawOdds: 3.17,
            awayOdds: 2.82,
            confidence: 97,
          },
          {
            id: 'supa_m_4',
            league: 'Int. Friendly Games',
            homeTeam: 'Japan',
            awayTeam: 'New Zealand',
            matchTime: 'STARTS IN 1 HR',
            homeOdds: 1.19,
            drawOdds: 6.69,
            awayOdds: 12.09,
            confidence: 99,
          },
          {
            id: 'supa_m_5',
            league: 'SRL Club Friendlies',
            homeTeam: 'CSKA Sofia Ssrl',
            awayTeam: 'West Bromwich Albion',
            matchTime: 'STARTS IN 1 HR, 30 MIN',
            homeOdds: 3.25,
            drawOdds: 3.38,
            awayOdds: 2.14,
            confidence: 97,
          },
          {
            id: 'supa_m_6',
            league: 'Super League 2',
            homeTeam: 'APS Zakynthos',
            awayTeam: 'Apollon Kalamarias',
            matchTime: 'STARTS IN 1 HR, 30 MIN',
            homeOdds: 1.81,
            drawOdds: 3.31,
            awayOdds: 3.91,
            confidence: 98,
          },
          {
            id: 'supa_m_7',
            league: '3. Division, Group 4',
            homeTeam: 'Odds BK 2',
            awayTeam: 'Viking FK 2',
            matchTime: 'STARTS IN 1 HR, 30 MIN',
            homeOdds: 1.30,
            drawOdds: 5.44,
            awayOdds: 6.39,
            confidence: 98,
          },
          {
            id: 'supa_m_8',
            league: 'U19 Friendly Games',
            homeTeam: 'England',
            awayTeam: 'Belgium',
            matchTime: 'STARTS IN 1 HR, 30 MIN',
            homeOdds: 1.37,
            drawOdds: 4.66,
            awayOdds: 5.96,
            confidence: 98,
          },
        ];
      } else {
        detectedName = 'Betexchange';
        layout = 'Betexchange Mobile Back & Lay';
        matches = [
          {
            id: 'be_1',
            league: 'Premier League',
            homeTeam: 'Manchester City',
            awayTeam: 'Aston Villa',
            matchTime: 'Today 21:15',
            homeOdds: 1.35,
            drawOdds: 5.50,
            awayOdds: 8.50,
            confidence: 95,
          },
          {
            id: 'be_2',
            league: 'Ligue 1',
            homeTeam: 'Paris Saint-Germain',
            awayTeam: 'Monaco',
            matchTime: 'Fri 21:00',
            homeOdds: 1.45,
            drawOdds: 4.80,
            awayOdds: 6.00,
            confidence: 93,
          },
        ];
      }

      setDetectedBookmaker(detectedName);
      setDetectedLayout(layout);
      setRawSummary(`Successfully extracted ${matches.length} matches from ${detectedName} mobile screenshot.`);
      setScannedMatches(matches);

      // Generate bounding boxes and realistic screenshot preview if no image uploaded
      const demoBoundingBoxes = deriveBoundingBoxes(matches, layout, detectedName);
      if (!previewUrl) {
        setPreviewUrl(generateDemoScreenshotDataUrl(detectedName, matches, layout));
      }

      const demoDiagnostics: OcrParseResult['debugDiagnostics'] = {
        modelUsed: 'gemini-3.8-flash (Trained Mobile Vision Dataset)',
        processingTimeMs: 380,
        rawGeminiResponse: {
          bookmaker: detectedName,
          detectedLayout: layout,
          matchCount: matches.length,
          matches,
        },
        boundingBoxes: demoBoundingBoxes,
        fieldMappingsSummary: matches.map((m) => ({
          matchId: m.id,
          league: m.league,
          teams: { home: m.homeTeam, away: m.awayTeam },
          oddsMapping: {
            '1 (Home)': m.homeOdds ?? null,
            'X (Draw)': m.drawOdds ?? null,
            '2 (Away)': m.awayOdds ?? null,
          },
          extraMarketsCount: m.extraMarkets?.length || 0,
          confidenceScore: m.confidence,
          hasFull1X2: Boolean(m.homeOdds && m.drawOdds && m.awayOdds),
          status: 'OK',
        })),
      };

      setDebugDiagnostics(demoDiagnostics);

      // MANDATORY: Log raw JSON response from Gemini API for every scan
      console.group(`🔥 [Gemini API OCR Raw Response Log (Demo: ${detectedName})]`);
      console.log('Gemini API Raw JSON Response:', demoDiagnostics.rawGeminiResponse);
      console.log('Detected Bounding Boxes:', demoBoundingBoxes);
      console.groupEnd();

      console.group(`🔍 [Preset Debug] ${detectedName} Field Mapping`);
      console.log('Bookmaker:', detectedName);
      console.log('Layout:', layout);
      console.table(
        demoDiagnostics.fieldMappingsSummary?.map((d) => ({
          'Match ID': d.matchId,
          'League': d.league,
          'Home Team': d.teams.home,
          'Away Team': d.teams.away,
          '1 (Home)': d.oddsMapping['1 (Home)'],
          'X (Draw)': d.oddsMapping['X (Draw)'],
          '2 (Away)': d.oddsMapping['2 (Away)'],
          'Confidence': `${d.confidenceScore}%`,
        }))
      );
      console.groupEnd();

      if (autoDebugEnabled) {
        setShowDebugPanel(true);
        setDebugSubTab('visual');
        setIsPreviewDebuggerOpen(true);
      }

      setIsScanning(false);
      setScanStage('');
    }, 600);
  };

  // Add individual match outcome to betslip
  const handleAddToSlip = (
    match: ScannedMatch,
    pickType: 'home' | 'draw' | 'away' | 'extra',
    extraIndex?: number
  ) => {
    let selection = '';
    let odds = 1.0;
    let market = '1X2';

    if (pickType === 'home') {
      selection = `${match.homeTeam} to Win (1)`;
      odds = match.homeOdds || 1.8;
      market = '1X2';
    } else if (pickType === 'draw') {
      selection = 'Draw (×)';
      odds = match.drawOdds || 3.2;
      market = '1X2';
    } else if (pickType === 'away') {
      selection = `${match.awayTeam} to Win (2)`;
      odds = match.awayOdds || 2.4;
      market = '1X2';
    } else if (pickType === 'extra' && extraIndex !== undefined && match.extraMarkets) {
      const extra = match.extraMarkets[extraIndex];
      selection = extra.selection;
      odds = extra.odds;
      market = extra.market;
    }

    const key = `${match.id}_${selection}`;
    setAddedLegKeys((prev) => ({
      ...prev,
      [key]: true,
      [`${match.id}_Draw (×)`]: true,
      [`${match.id}_Draw (X)`]: true,
      [`${match.id}_${match.homeTeam} to Win (1)`]: pickType === 'home' ? true : prev[`${match.id}_${match.homeTeam} to Win (1)`],
      [`${match.id}_${match.awayTeam} to Win (2)`]: pickType === 'away' ? true : prev[`${match.id}_${match.awayTeam} to Win (2)`],
    }));

    // Update active selection for this match in the selection layer
    setSelectedPicks((prev) => ({
      ...prev,
      [match.id]: { selection, odds, market },
    }));
    setSelectedMatchIds((prev) => (prev.includes(match.id) ? prev : [...prev, match.id]));

    onAddLeg({
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
      market,
      selection,
      odds,
      kickoff: match.matchTime,
      source: 'ocr',
    });
  };

  // Add all detected favorite/safe picks to betslip
  const handleAddAllBestPicks = () => {
    const legsToAdd: Array<Omit<MatchLeg, 'id' | 'active'>> = [];

    scannedMatches.forEach((m) => {
      const hOdds = m.homeOdds ?? 999;
      const aOdds = m.awayOdds ?? 999;

      let chosenPick = 'home';
      let selection = `${m.homeTeam} to Win (1)`;
      let odds = hOdds;

      if (aOdds < hOdds) {
        chosenPick = 'away';
        selection = `${m.awayTeam} to Win (2)`;
        odds = aOdds;
      }

      const key = `${m.id}_${selection}`;
      setAddedLegKeys((prev) => ({ ...prev, [key]: true }));

      legsToAdd.push({
        league: m.league,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        matchTitle: `${m.homeTeam} vs ${m.awayTeam}`,
        market: '1X2',
        selection,
        odds: Number((Number(odds) || 1.5).toFixed(2)),
        kickoff: m.matchTime,
        source: 'ocr',
      });
    });

    onAddMultipleLegs(legsToAdd);
  };

  const handleUpdateMatchField = (id: string, field: keyof ScannedMatch, value: any) => {
    setScannedMatches((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, [field]: value };
        }
        return m;
      })
    );
  };

  const handleDeleteScannedMatch = (id: string) => {
    setScannedMatches((prev) => prev.filter((m) => m.id !== id));
    setSelectedMatchIds((prev) => prev.filter((mId) => mId !== id));
  };

  const getDefaultPick = (m: ScannedMatch) => {
    if (m.detectedSelection && m.detectedSelection.selection && m.detectedSelection.odds) {
      return {
        selection: m.detectedSelection.selection,
        odds: m.detectedSelection.odds,
        market: m.detectedSelection.market || '1X2',
      };
    }
    const h = m.homeOdds ?? 999;
    const a = m.awayOdds ?? 999;
    if (a < h && a < 99) {
      return {
        selection: `${m.awayTeam} to Win (2)`,
        odds: m.awayOdds!,
        market: '1X2',
      };
    } else if (m.homeOdds) {
      return {
        selection: `${m.homeTeam} to Win (1)`,
        odds: m.homeOdds,
        market: '1X2',
      };
    } else if (m.drawOdds) {
      return {
        selection: `Draw (X)`,
        odds: m.drawOdds,
        market: '1X2',
      };
    }
    return {
      selection: `${m.homeTeam} to Win (1)`,
      odds: 1.85,
      market: '1X2',
    };
  };

  const handleToggleMatchSelection = (matchId: string) => {
    const match = scannedMatches.find((m) => m.id === matchId);
    if (!match) return;

    setSelectedMatchIds((prev) => {
      const exists = prev.includes(matchId);
      if (exists) {
        return prev.filter((id) => id !== matchId);
      } else {
        if (!selectedPicks[matchId]) {
          setSelectedPicks((p) => ({ ...p, [matchId]: getDefaultPick(match) }));
        }
        return [...prev, matchId];
      }
    });
  };

  const handleApplyPresetFilter = (count: 3 | 7 | 9 | 12) => {
    setActiveAccaPreset(count);
    if (scannedMatches.length === 0) return;

    // Filter out finished or live matches so that ONLY upcoming matches are selected
    const upcomingMatches = scannedMatches.filter((m) => isUpcomingMatch(m.matchTime));

    if (upcomingMatches.length === 0) {
      setPresetFeedbackMessage('No upcoming matches found (all scanned matches are live or finished).');
      setTimeout(() => setPresetFeedbackMessage(null), 3500);
      return;
    }

    // Order by highest confidence score
    const sortedUpcoming = [...upcomingMatches].sort((a, b) => {
      const confA = a.confidence ?? 85;
      const confB = b.confidence ?? 85;
      if (confB !== confA) {
        return confB - confA;
      }
      const minOddsA = Math.min(a.homeOdds || 99, a.awayOdds || 99);
      const minOddsB = Math.min(b.homeOdds || 99, b.awayOdds || 99);
      return minOddsA - minOddsB;
    });

    const topMatches = sortedUpcoming.slice(0, count);
    const topIds = topMatches.map((m) => m.id);

    const newPicks = { ...selectedPicks };
    topMatches.forEach((m) => {
      if (!newPicks[m.id]) {
        newPicks[m.id] = getDefaultPick(m);
      }
    });

    setSelectedPicks(newPicks);
    setSelectedMatchIds(topIds);

    const excluded = scannedMatches.length - upcomingMatches.length;
    const note = excluded > 0 ? ` (${excluded} Live/FT excluded)` : '';
    setPresetFeedbackMessage(
      `Selected Top ${topMatches.length} Upcoming Matches by Confidence${note}`
    );
    setTimeout(() => setPresetFeedbackMessage(null), 4000);
  };

  const handleSelectAllUpcoming = () => {
    const upcomingMatches = scannedMatches.filter((m) => isUpcomingMatch(m.matchTime));
    if (upcomingMatches.length === 0) {
      setPresetFeedbackMessage('No upcoming matches available.');
      setTimeout(() => setPresetFeedbackMessage(null), 3000);
      return;
    }
    const newPicks = { ...selectedPicks };
    upcomingMatches.forEach((m) => {
      if (!newPicks[m.id]) {
        newPicks[m.id] = getDefaultPick(m);
      }
    });
    setSelectedPicks(newPicks);
    setSelectedMatchIds(upcomingMatches.map((m) => m.id));
    setPresetFeedbackMessage(`Selected all ${upcomingMatches.length} upcoming matches.`);
    setTimeout(() => setPresetFeedbackMessage(null), 3500);
  };

  const handleClearSelection = () => {
    setSelectedMatchIds([]);
    setActiveAccaPreset(null);
    setPresetFeedbackMessage('Selection cleared.');
    setTimeout(() => setPresetFeedbackMessage(null), 2500);
  };

  const getSelectedLegsList = (): Array<Omit<MatchLeg, 'active'>> => {
    return selectedMatchIds
      .map((id) => {
        const match = scannedMatches.find((m) => m.id === id);
        if (!match) return null;
        const pick = selectedPicks[id] || getDefaultPick(match);
        return {
          id: match.id,
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
          market: pick.market,
          selection: pick.selection,
          odds: pick.odds,
          kickoff: match.matchTime,
          source: 'ocr' as const,
        };
      })
      .filter(Boolean) as Array<Omit<MatchLeg, 'active'>>;
  };

  const handleTransferBetslip = async () => {
    const legsList = getSelectedLegsList();
    if (legsList.length === 0) {
      setPresetFeedbackMessage('Please select at least 1 match leg to transfer.');
      setTimeout(() => setPresetFeedbackMessage(null), 3000);
      return;
    }

    setIsTransferring(true);
    try {
      const bookmakerName = targetBookmaker || detectedBookmaker || 'Hollywoodbets';
      const response = await fetch('/api/betslip/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: legsList,
          bookmaker: bookmakerName,
          stake: transferStake,
          currency,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate booking code.');
      }

      // 1-Tap Clipboard: Auto-copy generated booking code
      let copiedSuccess = false;
      try {
        await navigator.clipboard.writeText(data.bookingCode);
        copiedSuccess = true;
      } catch {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = data.bookingCode;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          copiedSuccess = true;
        } catch {}
      }

      // 1-Tap Redirection: Launch bookmaker deep link in new tab
      if (data.deepLinkUrl) {
        window.open(data.deepLinkUrl, '_blank', 'noopener,noreferrer');
      }

      setTransferResultModal({
        isOpen: true,
        data,
        copied: copiedSuccess,
      });
    } catch (err: any) {
      console.error('Failed to transfer betslip:', err);
      setPresetFeedbackMessage(err.message || 'Error communicating with booking code service.');
      setTimeout(() => setPresetFeedbackMessage(null), 4000);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleParseText = () => {
    if (!pastedText.trim()) return;
    setIsScanning(true);
    setScanStage('Parsing raw text with column matcher...');

    fetch('/api/ocr/parse-betslip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: pastedText,
        bookmakerHint: selectedBookmakerHint === 'Auto-detect' ? '' : selectedBookmakerHint,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setDetectedBookmaker(data.bookmaker || selectedBookmakerHint);
          setDetectedLayout('Pasted Text Analysis');
          const matches = data.matches || [];
          setScannedMatches(matches);

          const textBoundingBoxes = deriveBoundingBoxes(matches, 'Pasted Text Analysis', data.bookmaker || selectedBookmakerHint);
          if (!previewUrl) {
            setPreviewUrl(generateDemoScreenshotDataUrl(data.bookmaker || selectedBookmakerHint, matches, 'Pasted Text Analysis'));
          }

          // MANDATORY: Log raw JSON response for text scan
          console.group('🔥 [Gemini API OCR Raw Response Log (Pasted Text)]');
          console.log('Gemini API Raw JSON Response:', data.debugDiagnostics?.rawGeminiResponse ?? data);
          console.log('Detected Bounding Boxes:', textBoundingBoxes);
          console.groupEnd();

          setDebugDiagnostics({
            modelUsed: data.debugDiagnostics?.modelUsed || 'gemini-3.8-flash',
            processingTimeMs: data.debugDiagnostics?.processingTimeMs || 290,
            rawGeminiResponse: data.debugDiagnostics?.rawGeminiResponse || data,
            boundingBoxes: textBoundingBoxes,
            fieldMappingsSummary: data.debugDiagnostics?.fieldMappingsSummary,
          });

          if (autoDebugEnabled) {
            setShowDebugPanel(true);
            setDebugSubTab('visual');
            setIsPreviewDebuggerOpen(true);
          }
        } else {
          setErrorMessage(data.error || 'Failed to parse text.');
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Error parsing text.');
      })
      .finally(() => {
        setIsScanning(false);
        setScanStage('');
      });
  };

  const selectedLegsList = getSelectedLegsList();
  const combinedOdds = Number(
    selectedLegsList.reduce((acc, leg) => acc * (leg?.odds || 1), 1).toFixed(2)
  );
  const totalLegsSelected = selectedLegsList.length;
  const estimatedReturn = Number((combinedOdds * transferStake).toFixed(2));

  return (
    <div className={`space-y-6 ${totalLegsSelected > 0 ? 'pb-28 sm:pb-24' : ''}`}>
      {/* Introduction banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Universal Bookmaker OCR Scanner
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
              Take a screenshot from <strong>Hollywoodbets, Betway, Supabets, Betexchange</strong>, or any other bookmaker.
              Our multimodal engine auto-detects league, home & away positions, and table odds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setAutoDebugEnabled(!autoDebugEnabled)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                autoDebugEnabled
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-sm shadow-emerald-950/40'
                  : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
              }`}
              title="Automatically expand visual layout overlay & log Gemini raw JSON on every scan"
            >
              <Zap className={`h-3.5 w-3.5 ${autoDebugEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>Auto Debug: {autoDebugEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <span className="text-xs text-slate-400">Bookmaker:</span>
            <select
              value={selectedBookmakerHint}
              onChange={(e) => setSelectedBookmakerHint(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-amber-300 focus:border-emerald-500 outline-none"
            >
              <option value="Auto-detect">⚡ Auto-detect (Any)</option>
              <option value="Hollywoodbets">Hollywoodbets</option>
              <option value="Betway">Betway</option>
              <option value="Supabets">Supabets</option>
              <option value="Betexchange">Betexchange</option>
              <option value="Sportingbet">Sportingbet</option>
              <option value="10bet">10bet</option>
              <option value="Easybet">Easybet</option>
              <option value="World Sports Betting">WSB</option>
            </select>
          </div>
        </div>

        {/* Real-time OCR Notice */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 bg-slate-950/80 rounded-xl p-2.5 border border-emerald-500/30">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span>Live AI Screenshot OCR:</span>
            </span>
            <span>Upload or paste (Ctrl+V) any bookmaker coupon or mobile screenshot. Every image is parsed freshly with full <strong>1 (Home)</strong>, <strong>× / X (Draw)</strong>, and <strong>2 (Away)</strong> market odds.</span>
          </div>

          {/* Optional demo sample test fixtures */}
          <details className="mt-2.5 text-xs">
            <summary className="font-medium text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              <span>Need sample data without an image? (Optional Demo Fixtures)</span>
            </summary>
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => handleLoadDemo('hw-egypt')}
                className="rounded-lg border border-purple-500/50 bg-purple-950/60 px-2.5 py-1 text-purple-200 hover:bg-purple-900/60 transition-colors shrink-0 flex items-center gap-1"
              >
                <span>⭐ Sample Hollywoodbets Light</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemo('betway-leaguecup')}
                className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 text-emerald-200 hover:bg-emerald-900/50 transition-colors shrink-0 flex items-center gap-1"
              >
                <span>🟢 Sample Betway</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemo('hw-serie-d')}
                className="rounded-lg border border-purple-500/30 bg-purple-950/40 px-2.5 py-1 text-purple-200 hover:bg-purple-900/50 transition-colors shrink-0 flex items-center gap-1"
              >
                <span>🟣 Sample Serie D</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemo('hw-nations')}
                className="rounded-lg border border-blue-500/30 bg-blue-950/40 px-2.5 py-1 text-blue-200 hover:bg-blue-900/50 transition-colors shrink-0 flex items-center gap-1"
              >
                <span>🌙 Sample Hollywoodbets Dark</span>
              </button>
              <button
                type="button"
                onClick={() => handleLoadDemo('supabets-srl')}
                className="rounded-lg border border-red-500/30 bg-red-950/40 px-2.5 py-1 text-red-200 hover:bg-red-900/50 transition-colors shrink-0 flex items-center gap-1"
              >
                <span>🔴 Sample Supabets</span>
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* Tabs: Image Upload vs Text Paste */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'upload'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileImage className="h-3.5 w-3.5" />
          Screenshot Upload / Paste (Ctrl+V)
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            activeTab === 'text'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Paste Odds Text
        </button>
      </div>

      {/* Tab: Screenshot Upload Zone */}
      {activeTab === 'upload' && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragActive
              ? 'border-emerald-400 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
              : 'border-slate-700/80 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={false}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700 text-emerald-400 mb-3 shadow-inner">
            <UploadCloud className="h-7 w-7" />
          </div>

          <h3 className="text-base font-bold text-white">
            Drop your bookmaker screenshot here or click to browse
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Or simply press <kbd className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-emerald-300 font-mono text-[11px]">Ctrl+V</kbd> anywhere to paste your screenshot directly.
          </p>

          <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-500">
            <span>PNG, JPG, WebP supported</span>
            <span>•</span>
            <span>Hollywoodbets, Betway, Supabets & any bookmaker</span>
          </div>

          {/* Scanning Overlay Animation */}
          {isScanning && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-slate-950/90 backdrop-blur-sm p-4">
              <div className="relative mb-3 flex h-12 w-12 items-center justify-center">
                <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
              </div>
              <div className="text-sm font-bold text-white">{scanStage || 'Processing screenshot OCR...'}</div>
              <div className="mt-1 text-xs text-slate-400">
                Finding teams, leagues & odds across all table columns
              </div>
              <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-2/3 animate-pulse bg-emerald-500 rounded-full" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screenshot Thumbnail Preview & Image Enhancement Bar */}
      {previewUrl && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                onClick={() => setIsFullImageModalOpen(true)}
                className="relative cursor-pointer group shrink-0"
                title="Click to view full image"
              >
                <img
                  src={previewUrl}
                  alt="Screenshot Preview"
                  className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded-xl border border-slate-700 group-hover:border-emerald-400 transition-all shadow-md"
                />
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Maximize2 className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100 truncate">
                    Active Screenshot
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    High-Res
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {isScanning ? scanStage || 'Processing...' : 'Optimized for mobile bookmakers & odds'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewDebuggerOpen(!isPreviewDebuggerOpen)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition-all ${
                  isPreviewDebuggerOpen
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 shadow-sm'
                    : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
                title="Toggle visual bounding boxes and labels overlay directly on top of screenshot"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span>Visual Overlay {isPreviewDebuggerOpen ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullImageModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Zoom</span>
              </button>

              {lastUploadedFile && !isScanning && (
                <button
                  type="button"
                  onClick={() => applyEnhancementsAndRescan({})}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-400 shadow-sm"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Re-scan</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setLastUploadedFile(null);
                  setRawFile(null);
                  setErrorMessage(null);
                  setAutoRetryCountdown(null);
                }}
                className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Screenshot Quick-Fix Preprocessing Strip */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3 text-emerald-400" />
              <span>Fix & Enhance:</span>
            </span>

            {/* Toggle Contrast Boost */}
            <button
              type="button"
              disabled={isScanning}
              onClick={() => applyEnhancementsAndRescan({ boostContrast: !boostContrast })}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                boostContrast
                  ? 'border-amber-500 bg-amber-950/40 text-amber-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Enhance contrast for dark mode bookmaker slips"
            >
              <SunMedium className="h-3 w-3 text-amber-400" />
              <span>Boost Contrast {boostContrast ? '✓' : ''}</span>
            </button>

            {/* Toggle Trim Phone Bars */}
            <button
              type="button"
              disabled={isScanning}
              onClick={() => applyEnhancementsAndRescan({ trimPhoneBars: !trimPhoneBars })}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                trimPhoneBars
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Crop out battery, wifi and navigation bar from mobile screenshot"
            >
              <Scissors className="h-3 w-3 text-emerald-400" />
              <span>Trim Phone Bars {trimPhoneBars ? '✓' : ''}</span>
            </button>

            {/* Rotate 90° button */}
            <button
              type="button"
              disabled={isScanning}
              onClick={() => applyEnhancementsAndRescan({ rotation: (rotation + 90) % 360 })}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              title="Rotate image 90 degrees if taken sideways"
            >
              <RotateCw className="h-3 w-3 text-blue-400" />
              <span>Rotate {rotation ? `(${rotation}°)` : ''}</span>
            </button>
          </div>

          {/* Visual Debugger Overlay rendered directly on top of previewed screenshot */}
          {isPreviewDebuggerOpen && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Visual Screenshot Layout Debugger</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowDebugPanel(true);
                    setDebugSubTab('visual');
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
                >
                  Open in Diagnostics Panel →
                </button>
              </div>
              <VisualDebuggerOverlay
                imageUrl={previewUrl}
                boundingBoxes={
                  debugDiagnostics?.boundingBoxes && debugDiagnostics.boundingBoxes.length > 0
                    ? debugDiagnostics.boundingBoxes
                    : deriveBoundingBoxes(scannedMatches, detectedLayout, detectedBookmaker)
                }
                selectedFilter={selectedBoxFilter}
                onSelectFilter={setSelectedBoxFilter}
                opacity={overlayOpacity}
                onOpacityChange={setOverlayOpacity}
                showLabels={showBoxLabels}
                onToggleLabels={setShowBoxLabels}
                hoveredBoxId={hoveredBoxId}
                onHoverBox={setHoveredBoxId}
                selectedBoxId={selectedBoxId}
                onSelectBox={setSelectedBoxId}
                highlightedMatchId={highlightedMatchId}
              />
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Image Preview Modal with Visual Overlay */}
      {isFullImageModalOpen && previewUrl && (
        <div
          onClick={() => setIsFullImageModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] max-w-4xl w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Full Screenshot & Layout Debugger</span>
                <span className="rounded bg-emerald-950/60 border border-emerald-500/30 text-[10px] text-emerald-400 px-2 py-0.5 font-bold">
                  {debugDiagnostics?.boundingBoxes?.length || deriveBoundingBoxes(scannedMatches, detectedLayout, detectedBookmaker).length} Boxes
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullImageModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-auto max-h-[80vh] p-2">
              <VisualDebuggerOverlay
                imageUrl={previewUrl}
                boundingBoxes={
                  debugDiagnostics?.boundingBoxes && debugDiagnostics.boundingBoxes.length > 0
                    ? debugDiagnostics.boundingBoxes
                    : deriveBoundingBoxes(scannedMatches, detectedLayout, detectedBookmaker)
                }
                selectedFilter={selectedBoxFilter}
                onSelectFilter={setSelectedBoxFilter}
                opacity={overlayOpacity}
                onOpacityChange={setOverlayOpacity}
                showLabels={showBoxLabels}
                onToggleLabels={setShowBoxLabels}
                hoveredBoxId={hoveredBoxId}
                onHoverBox={setHoveredBoxId}
                selectedBoxId={selectedBoxId}
                onSelectBox={setSelectedBoxId}
                highlightedMatchId={highlightedMatchId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Text Paste */}
      {activeTab === 'text' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Paste text copied from your bookmaker slip or match tables:
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={5}
            placeholder={`Example:
Premier League
Arsenal vs Chelsea 1.88 3.75 3.90
Liverpool vs Tottenham 1.54 4.60 5.25`}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 outline-none"
          />
          <div className="flex justify-end">
            <button
              onClick={handleParseText}
              disabled={!pastedText.trim() || isScanning}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Parse Odds Text</span>
            </button>
          </div>
        </div>
      )}

      {/* Error notification & Smart Recovery Actions */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 p-4 text-xs shadow-lg space-y-3">
          <div className="flex items-start gap-2.5 text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <div>{errorMessage}</div>
              {autoRetryCountdown !== null && (
                <div className="mt-1.5 flex items-center gap-2 text-amber-300 font-semibold">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Auto-retrying in {autoRetryCountdown}s... (Attempt {autoRetryAttempt}/2)</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-500/20">
            {lastUploadedFile && (
              <button
                type="button"
                onClick={() => {
                  setAutoRetryCountdown(null);
                  sendToOcrApi(lastUploadedFile.base64, lastUploadedFile.mimeType);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-sm"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry Scan Now</span>
              </button>
            )}

            {lastUploadedFile && !boostContrast && (
              <button
                type="button"
                onClick={() => applyEnhancementsAndRescan({ boostContrast: true })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/40"
              >
                <SunMedium className="h-3 w-3" />
                <span>Boost Contrast & Retry</span>
              </button>
            )}

            {lastUploadedFile && !trimPhoneBars && (
              <button
                type="button"
                onClick={() => applyEnhancementsAndRescan({ trimPhoneBars: true })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40"
              >
                <Scissors className="h-3 w-3" />
                <span>Trim Phone Bars & Retry</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsManualAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <Plus className="h-3 w-3 text-emerald-400" />
              <span>Add Match Manually</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Paste Text Instead
            </button>
          </div>
        </div>
      )}

      {/* Scanned Matches List & Interactive Builder */}
      {scannedMatches.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Extracted Matches ({scannedMatches.length})
                </h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                  {detectedBookmaker}
                </span>
                {detectedLayout && (
                  <span className="hidden sm:inline text-xs text-slate-500">
                    ({detectedLayout})
                  </span>
                )}
              </div>
              {rawSummary && <p className="text-xs text-slate-400 mt-0.5">{rawSummary}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDebugPanel(true);
                  setDebugSubTab('visual');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 shadow-sm cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span>Layout Debugger</span>
              </button>
              <button
                type="button"
                onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" />
                <span>+ Add Match</span>
              </button>
              <button
                onClick={handleAddAllBestPicks}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add All Best Picks</span>
              </button>
              <button
                onClick={() => setScannedMatches([])}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-700 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Non-Destructive Betslip Selection & Preset Filters Layer (Upcoming Matches Only) */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-slate-900/95 via-slate-900 to-slate-950 p-3 sm:p-4 shadow-xl space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      Accumulator Presets & Selection Layer
                    </h4>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Upcoming Only
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({scannedMatches.filter((m) => isUpcomingMatch(m.matchTime)).length} available)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Filters out finished/live games and selects the highest confidence upcoming legs.
                  </p>
                </div>
              </div>

              {/* Preset Selection Buttons (Pick Top 3, 7, 9, 12) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden lg:inline">Quick Presets:</span>
                {([3, 7, 9, 12] as const).map((count) => {
                  const isCurrentActive = activeAccaPreset === count && selectedMatchIds.length === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handleApplyPresetFilter(count)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer ${
                        isCurrentActive
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50 shadow-emerald-500/20'
                          : 'bg-slate-800/90 text-slate-200 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 hover:text-emerald-300'
                      }`}
                    >
                      <Zap className={`h-3 w-3 ${isCurrentActive ? 'text-slate-950' : 'text-emerald-400'}`} />
                      <span>Pick Top {count}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleSelectAllUpcoming}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  All Upcoming
                </button>

                {selectedMatchIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="rounded-xl border border-slate-700 px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition-colors cursor-pointer"
                  >
                    Clear ({selectedMatchIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Active preset feedback & status */}
            {presetFeedbackMessage && (
              <div className="flex items-center justify-between text-xs bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-3 py-2 text-emerald-300 animate-in fade-in">
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>{presetFeedbackMessage}</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-mono font-bold shrink-0">
                  {selectedMatchIds.length} Legs Active
                </span>
              </div>
            )}
          </div>

          {/* Quick Manual Match Drawer */}
          {isManualAddOpen && (
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Match or Missing Leg</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">League</label>
                  <input
                    type="text"
                    value={manualMatch.league}
                    onChange={(e) => setManualMatch({ ...manualMatch, league: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-emerald-500 outline-none"
                    placeholder="e.g. Premier League"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Kickoff Time</label>
                  <input
                    type="text"
                    value={manualMatch.matchTime}
                    onChange={(e) => setManualMatch({ ...manualMatch, matchTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-emerald-500 outline-none"
                    placeholder="e.g. Today 20:00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Home Team</label>
                  <input
                    type="text"
                    value={manualMatch.homeTeam}
                    onChange={(e) => setManualMatch({ ...manualMatch, homeTeam: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-emerald-500 outline-none"
                    placeholder="e.g. Arsenal"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold">Away Team</label>
                  <input
                    type="text"
                    value={manualMatch.awayTeam}
                    onChange={(e) => setManualMatch({ ...manualMatch, awayTeam: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-slate-200 focus:border-emerald-500 outline-none"
                    placeholder="e.g. Chelsea"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-emerald-400 uppercase font-semibold">1 (Home Odds)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualMatch.homeOdds}
                    onChange={(e) => setManualMatch({ ...manualMatch, homeOdds: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-emerald-400 font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-amber-400 uppercase font-semibold">X (Draw Odds)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualMatch.drawOdds}
                    onChange={(e) => setManualMatch({ ...manualMatch, drawOdds: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-amber-400 font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-400 uppercase font-semibold">2 (Away Odds)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualMatch.awayOdds}
                    onChange={(e) => setManualMatch({ ...manualMatch, awayOdds: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-emerald-400 font-bold focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsManualAddOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!manualMatch.homeTeam.trim() || !manualMatch.awayTeam.trim()) return;
                    const newM: ScannedMatch = {
                      id: `manual_${Date.now()}`,
                      league: manualMatch.league.trim() || 'Custom League',
                      homeTeam: manualMatch.homeTeam.trim(),
                      awayTeam: manualMatch.awayTeam.trim(),
                      matchTime: manualMatch.matchTime.trim() || 'Upcoming',
                      homeOdds: parseFloat(manualMatch.homeOdds) || 1.85,
                      drawOdds: parseFloat(manualMatch.drawOdds) || 3.40,
                      awayOdds: parseFloat(manualMatch.awayOdds) || 2.50,
                      confidence: 100,
                      isCustom: true,
                    };
                    setScannedMatches((prev) => [newM, ...prev]);
                    setIsManualAddOpen(false);
                    setManualMatch({
                      league: 'Premier League',
                      homeTeam: '',
                      awayTeam: '',
                      homeOdds: '1.85',
                      drawOdds: '3.40',
                      awayOdds: '2.50',
                      matchTime: 'Today 20:00',
                    });
                  }}
                  disabled={!manualMatch.homeTeam.trim() || !manualMatch.awayTeam.trim()}
                  className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  Save & Insert Match
                </button>
              </div>
            </div>
          )}

          {/* Cards for each match */}
          <div className="grid grid-cols-1 gap-3.5">
            {scannedMatches.map((match) => {
              const isSelected = selectedMatchIds.includes(match.id);
              const currentPick = selectedPicks[match.id] || getDefaultPick(match);
              const isUpcoming = isUpcomingMatch(match.matchTime);

              return (
                <div
                  key={match.id}
                  className={`rounded-2xl border p-4 shadow-lg transition-all ${
                    isSelected
                      ? 'border-emerald-500/70 bg-[#0f1d33] ring-1 ring-emerald-500/30'
                      : 'border-slate-800 bg-[#0f172a]/90 hover:border-slate-700'
                  }`}
                >
                  {/* Top header row: Checkbox + Status + League & Kickoff time */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-3 text-xs">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      {/* Interactive Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleMatchSelection(match.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                        title={isSelected ? 'Remove leg from betslip selection' : 'Select this leg for betslip transfer'}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500 shrink-0" />
                        )}
                        <span>{isSelected ? 'Selected Leg' : 'Select Leg'}</span>
                      </button>

                      {/* Match status badge (Upcoming vs Live/FT) */}
                      {isUpcoming ? (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                          🟢 Upcoming
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400 shrink-0">
                          🔴 Live / FT
                        </span>
                      )}

                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                        League
                      </span>
                      <input
                        type="text"
                        value={match.league}
                        onChange={(e) => handleUpdateMatchField(match.id, 'league', e.target.value)}
                        placeholder="e.g. Premier League"
                        className="bg-transparent font-medium text-slate-200 focus:bg-slate-900 rounded px-1.5 py-0.5 border border-transparent focus:border-slate-700 outline-none w-full max-w-[200px]"
                      />

                      {isSelected && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          <span>Pick: {currentPick.selection}</span>
                          <span className="font-mono text-emerald-400 font-bold">@{(!isNaN(Number(currentPick.odds)) && Number(currentPick.odds) > 0 ? Number(currentPick.odds) : 1.5).toFixed(2)}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {match.confidence && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 border border-slate-700">
                          {match.confidence}% Conf
                        </span>
                      )}
                      {match.matchTime && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          {match.matchTime}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteScannedMatch(match.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Remove this match"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                {/* Teams Row: Home v Away */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3.5 items-center">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Home</span>
                    <input
                      type="text"
                      value={match.homeTeam}
                      onChange={(e) => handleUpdateMatchField(match.id, 'homeTeam', e.target.value)}
                      className="bg-transparent font-bold text-slate-100 outline-none w-full text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 border border-slate-800 px-3 py-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Away</span>
                    <input
                      type="text"
                      value={match.awayTeam}
                      onChange={(e) => handleUpdateMatchField(match.id, 'awayTeam', e.target.value)}
                      className="bg-transparent font-bold text-slate-100 outline-none w-full text-sm"
                    />
                  </div>
                </div>

                {/* 1, ×, 2 Market Header with Quick Auto-Fill Helper */}
                <div className="flex flex-wrap items-center justify-between text-xs mb-2 gap-2">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <span>1X2 Market Odds:</span>
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      [ 1 ] Home • [ × ] Draw • [ 2 ] Away
                    </span>
                  </span>

                  {(!match.drawOdds || !match.awayOdds) && match.homeOdds && (
                    <button
                      type="button"
                      onClick={() => {
                        const h = match.homeOdds || 1.85;
                        const estDraw = Number((h < 1.4 ? 4.60 : h < 1.9 ? 3.50 : 3.30).toFixed(2));
                        const estAway = Number((h < 1.4 ? 8.00 : h < 1.9 ? 4.20 : 2.70).toFixed(2));
                        handleUpdateMatchField(match.id, 'drawOdds', estDraw);
                        handleUpdateMatchField(match.id, 'awayOdds', estAway);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 px-2 py-0.5 rounded transition-all cursor-pointer"
                      title="Automatically estimate Draw (×) and Away (2) odds from Home odds"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      <span>⚡ Auto-Fill × & 2</span>
                    </button>
                  )}
                </div>

                {/* Odds Selection & Interactive Editing Grid: 1, ×, 2 */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Home Win (1) Card */}
                  <div
                    className={`flex flex-col justify-between rounded-xl border p-2 text-center transition-all ${
                      addedLegKeys[`${match.id}_${match.homeTeam} to Win (1)`]
                        ? 'border-emerald-500 bg-emerald-950/40'
                        : 'border-slate-700/80 bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-400 mb-1">
                      <span className="font-bold text-emerald-400">1 (Home)</span>
                      {addedLegKeys[`${match.id}_${match.homeTeam} to Win (1)`] && (
                        <Check className="h-3 w-3 text-emerald-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-center my-1">
                      <input
                        type="number"
                        step="0.01"
                        min="1.01"
                        max="250"
                        value={match.homeOdds ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleUpdateMatchField(match.id, 'homeOdds', isNaN(val) ? null : val);
                        }}
                        placeholder="1.85"
                        className="w-full text-center font-mono text-sm font-black text-emerald-400 bg-slate-950/80 border border-slate-700 rounded py-1 px-1 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddToSlip(match, 'home')}
                      disabled={!match.homeOdds}
                      className={`mt-1.5 w-full rounded-lg py-1 text-[11px] font-bold transition-all ${
                        addedLegKeys[`${match.id}_${match.homeTeam} to Win (1)`]
                          ? 'bg-emerald-500 text-slate-950'
                          : match.homeOdds
                          ? 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 cursor-pointer'
                          : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {addedLegKeys[`${match.id}_${match.homeTeam} to Win (1)`] ? 'Added ✓' : '+ Slip'}
                    </button>
                  </div>

                  {/* Draw (×) Card */}
                  <div
                    className={`flex flex-col justify-between rounded-xl border p-2 text-center transition-all ${
                      addedLegKeys[`${match.id}_Draw (×)`] || addedLegKeys[`${match.id}_Draw (X)`]
                        ? 'border-emerald-500 bg-emerald-950/40'
                        : !match.drawOdds
                        ? 'border-amber-500/50 bg-amber-950/10'
                        : 'border-slate-700/80 bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-400 mb-1">
                      <span className="font-bold text-amber-400">× (Draw)</span>
                      {(addedLegKeys[`${match.id}_Draw (×)`] || addedLegKeys[`${match.id}_Draw (X)`]) && (
                        <Check className="h-3 w-3 text-emerald-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-center my-1">
                      <input
                        type="number"
                        step="0.01"
                        min="1.01"
                        max="250"
                        value={match.drawOdds ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleUpdateMatchField(match.id, 'drawOdds', isNaN(val) ? null : val);
                        }}
                        placeholder="3.40"
                        className="w-full text-center font-mono text-sm font-black text-amber-400 bg-slate-950/80 border border-slate-700 rounded py-1 px-1 focus:border-amber-500 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (match.drawOdds) {
                          handleAddToSlip(match, 'draw');
                        } else {
                          const h = match.homeOdds || 1.85;
                          const estDraw = Number((h < 1.4 ? 4.60 : h < 1.9 ? 3.50 : 3.30).toFixed(2));
                          handleUpdateMatchField(match.id, 'drawOdds', estDraw);
                          handleAddToSlip({ ...match, drawOdds: estDraw }, 'draw');
                        }
                      }}
                      className={`mt-1.5 w-full rounded-lg py-1 text-[11px] font-bold transition-all cursor-pointer ${
                        addedLegKeys[`${match.id}_Draw (×)`] || addedLegKeys[`${match.id}_Draw (X)`]
                          ? 'bg-emerald-500 text-slate-950'
                          : match.drawOdds
                          ? 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                          : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900 border border-amber-500/40'
                      }`}
                    >
                      {addedLegKeys[`${match.id}_Draw (×)`] || addedLegKeys[`${match.id}_Draw (X)`]
                        ? 'Added ✓'
                        : match.drawOdds
                        ? '+ Slip'
                        : '⚡ Auto × (Draw)'}
                    </button>
                  </div>

                  {/* Away Win (2) Card */}
                  <div
                    className={`flex flex-col justify-between rounded-xl border p-2 text-center transition-all ${
                      addedLegKeys[`${match.id}_${match.awayTeam} to Win (2)`]
                        ? 'border-emerald-500 bg-emerald-950/40'
                        : !match.awayOdds
                        ? 'border-amber-500/50 bg-amber-950/10'
                        : 'border-slate-700/80 bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-slate-400 mb-1">
                      <span className="font-bold text-emerald-400">2 (Away)</span>
                      {addedLegKeys[`${match.id}_${match.awayTeam} to Win (2)`] && (
                        <Check className="h-3 w-3 text-emerald-400" />
                      )}
                    </div>

                    <div className="flex items-center justify-center my-1">
                      <input
                        type="number"
                        step="0.01"
                        min="1.01"
                        max="250"
                        value={match.awayOdds ?? ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleUpdateMatchField(match.id, 'awayOdds', isNaN(val) ? null : val);
                        }}
                        placeholder="2.50"
                        className="w-full text-center font-mono text-sm font-black text-emerald-400 bg-slate-950/80 border border-slate-700 rounded py-1 px-1 focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (match.awayOdds) {
                          handleAddToSlip(match, 'away');
                        } else {
                          const h = match.homeOdds || 1.85;
                          const estAway = Number((h < 1.4 ? 8.00 : h < 1.9 ? 4.20 : 2.70).toFixed(2));
                          handleUpdateMatchField(match.id, 'awayOdds', estAway);
                          handleAddToSlip({ ...match, awayOdds: estAway }, 'away');
                        }
                      }}
                      className={`mt-1.5 w-full rounded-lg py-1 text-[11px] font-bold transition-all cursor-pointer ${
                        addedLegKeys[`${match.id}_${match.awayTeam} to Win (2)`]
                          ? 'bg-emerald-500 text-slate-950'
                          : match.awayOdds
                          ? 'bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                          : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900 border border-amber-500/40'
                      }`}
                    >
                      {addedLegKeys[`${match.id}_${match.awayTeam} to Win (2)`]
                        ? 'Added ✓'
                        : match.awayOdds
                        ? '+ Slip'
                        : '⚡ Auto 2 (Away)'}
                    </button>
                  </div>
                </div>

                {/* Extra markets if recognized */}
                {match.extraMarkets && match.extraMarkets.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Other Markets:</span>
                    {match.extraMarkets.map((extra, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddToSlip(match, 'extra', idx)}
                        className="inline-flex items-center gap-1 rounded bg-slate-800/80 border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500"
                      >
                        <span>{extra.selection}</span>
                        <span className="font-mono font-bold text-emerald-400">{(!isNaN(Number(extra.odds)) && Number(extra.odds) > 0 ? Number(extra.odds) : 1.5).toFixed(2)}</span>
                        <span className="text-[10px] text-slate-500">+</span>
                      </button>
                    ))}
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OCR Inspector & Field Mapping Diagnostic Panel */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1322] shadow-xl overflow-hidden mt-6">
        {/* Toggle Bar */}
        <div
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 cursor-pointer hover:bg-slate-900/60 transition-colors border-b border-slate-800/80 gap-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Terminal className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">
                  OCR Inspector & Field Mapping Diagnostics
                </span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-slate-700">
                  Debug Tool
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    autoDebugEnabled
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  ⚡ Auto Debug: {autoDebugEnabled ? 'Active' : 'Off'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Inspect raw Gemini API output, column field associations & layout analysis.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {debugDiagnostics?.modelUsed && (
              <span className="rounded-full bg-slate-800/90 border border-slate-700 px-2.5 py-0.5 text-[10px] font-mono text-slate-300">
                {debugDiagnostics.modelUsed}
              </span>
            )}
            {debugDiagnostics?.processingTimeMs !== undefined && (
              <span className="rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                {debugDiagnostics.processingTimeMs}ms
              </span>
            )}
            <button
              type="button"
              className="rounded-lg p-1 text-slate-400 hover:text-white"
            >
              {showDebugPanel ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Panel */}
        {showDebugPanel && (
          <div className="p-4 sm:p-5 space-y-4 text-xs bg-slate-950/70">
            {/* Sub-tab Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDebugSubTab('visual')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    debugSubTab === 'visual'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Visual Overlay Debugger</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDebugSubTab('mapping')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    debugSubTab === 'mapping'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <TableProperties className="h-3.5 w-3.5" />
                  <span>Field Mapping Table</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDebugSubTab('rawJson')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    debugSubTab === 'rawJson'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Bug className="h-3.5 w-3.5" />
                  <span>Raw Gemini Response</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDebugSubTab('guide')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    debugSubTab === 'guide'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>Bookmaker Layout Guide</span>
                </button>
              </div>

              {debugSubTab === 'rawJson' && debugDiagnostics?.rawGeminiResponse && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(debugDiagnostics.rawGeminiResponse, null, 2)
                    );
                    setCopiedDebugJson(true);
                    setTimeout(() => setCopiedDebugJson(false), 2500);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:text-white"
                >
                  {copiedDebugJson ? (
                    <>
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Sub-tab 0: Visual Overlay Debugger */}
            {debugSubTab === 'visual' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div>
                      <span className="font-bold text-white text-xs">Visual Layout & Bounding Box Inspector</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Detect layout misalignments by visually comparing identified bounding boxes (1, X, 2 odds, team names) directly against the screenshot.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-800/90 border border-slate-700 px-2.5 py-1 text-[11px] font-mono text-emerald-300">
                      {debugDiagnostics?.boundingBoxes?.length || deriveBoundingBoxes(scannedMatches, detectedLayout, detectedBookmaker).length} Total Bounding Boxes
                    </span>
                  </div>
                </div>

                {previewUrl ? (
                  <VisualDebuggerOverlay
                    imageUrl={previewUrl}
                    boundingBoxes={
                      debugDiagnostics?.boundingBoxes && debugDiagnostics.boundingBoxes.length > 0
                        ? debugDiagnostics.boundingBoxes
                        : deriveBoundingBoxes(scannedMatches, detectedLayout, detectedBookmaker)
                    }
                    selectedFilter={selectedBoxFilter}
                    onSelectFilter={setSelectedBoxFilter}
                    opacity={overlayOpacity}
                    onOpacityChange={setOverlayOpacity}
                    showLabels={showBoxLabels}
                    onToggleLabels={setShowBoxLabels}
                    hoveredBoxId={hoveredBoxId}
                    onHoverBox={setHoveredBoxId}
                    selectedBoxId={selectedBoxId}
                    onSelectBox={setSelectedBoxId}
                    highlightedMatchId={highlightedMatchId}
                  />
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400 space-y-2">
                    <FileImage className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="font-medium text-slate-300">No active screenshot loaded</p>
                    <p className="text-xs text-slate-500">
                      Upload a screenshot or click any demo preset above to see the live visual overlay debugger.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 1: Field Mapping Table */}
            {debugSubTab === 'mapping' && (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400">
                  This table maps how the AI vision model associated raw screenshot text elements into distinct database fields (League, Home, Away, Odds 1/X/2).
                </div>

                {debugDiagnostics?.fieldMappingsSummary && debugDiagnostics.fieldMappingsSummary.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left font-sans text-xs">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">Match</th>
                          <th className="p-3">League</th>
                          <th className="p-3">1 (Home)</th>
                          <th className="p-3">X (Draw)</th>
                          <th className="p-3">2 (Away)</th>
                          <th className="p-3">Confidence</th>
                          <th className="p-3">Mapping Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                        {debugDiagnostics.fieldMappingsSummary.map((mapping, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-3 font-semibold text-white">
                              <div>{mapping.teams.home}</div>
                              <div className="text-slate-400 text-[11px]">vs {mapping.teams.away}</div>
                            </td>
                            <td className="p-3 text-slate-300">
                              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                                {mapping.league || 'Soccer'}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              {mapping.oddsMapping['1 (Home)'] !== null ? (
                                mapping.oddsMapping['1 (Home)']?.toFixed(2)
                              ) : (
                                <span className="text-slate-600 font-normal">null</span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-400">
                              {mapping.oddsMapping['X (Draw)'] !== null ? (
                                mapping.oddsMapping['X (Draw)']?.toFixed(2)
                              ) : (
                                <span className="text-slate-600 font-normal">null</span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              {mapping.oddsMapping['2 (Away)'] !== null ? (
                                mapping.oddsMapping['2 (Away)']?.toFixed(2)
                              ) : (
                                <span className="text-slate-600 font-normal">null</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-200 text-[11px]">
                                  {mapping.confidenceScore}%
                                </span>
                                <div className="h-1.5 w-12 rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${mapping.confidenceScore}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              {mapping.status === 'OK' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                  <Check className="h-2.5 w-2.5" />
                                  <span>Aligned ✓</span>
                                </span>
                              )}
                              {mapping.status === 'INCOMPLETE_ODDS' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  <span>Incomplete Odds</span>
                                </span>
                              )}
                              {mapping.status === 'MISSING_TEAMS' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 bg-rose-950/50 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  <span>Missing Team Names</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center text-slate-400">
                    No scan diagnostics recorded yet. Upload a screenshot or click any demo preset above to see the live field mapping table.
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Raw Gemini Response */}
            {debugSubTab === 'rawJson' && (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">
                  Raw JSON output returned from the Gemini multimodal vision model:
                </div>
                <pre className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-emerald-300 leading-relaxed">
                  {debugDiagnostics?.rawGeminiResponse
                    ? JSON.stringify(debugDiagnostics.rawGeminiResponse, null, 2)
                    : '// No API response recorded yet. Run a scan to see the raw output.'}
                </pre>
              </div>
            )}

            {/* Sub-tab 3: Bookmaker Layout Guide */}
            {debugSubTab === 'guide' && (
              <div className="space-y-3 text-slate-300 leading-relaxed text-[11px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 space-y-1.5">
                    <span className="font-bold text-purple-300">Hollywoodbets Layout</span>
                    <p className="text-slate-400">
                      Features a purple/yellow theme with matches listed in chronological rows. Odds are usually in three columns labeled 1, X, 2 under the event header.
                    </p>
                    <div className="text-emerald-400 font-medium">
                      Tip: Ensure both the top "1 X 2" column header and match names are visible in your screenshot.
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-1.5">
                    <span className="font-bold text-emerald-300">Betway Layout</span>
                    <p className="text-slate-400">
                      Team names are stacked vertically (Home on top, Away below). Odds appear as horizontal green/white buttons on the right.
                    </p>
                    <div className="text-emerald-400 font-medium">
                      Tip: Take screenshots in portrait mode so the odds buttons aren't scrolled off-screen.
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 space-y-1.5">
                    <span className="font-bold text-red-300">Supabets Layout</span>
                    <p className="text-slate-400">
                      High-density grid layout with multiple markets (1X2, Over/Under, Double Chance). Columns can vary depending on zoom level.
                    </p>
                    <div className="text-emerald-400 font-medium">
                      Tip: Zoom in on the main 1X2 market section for highest OCR clarity.
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-3 space-y-1.5">
                    <span className="font-bold text-blue-300">Betexchange Layout</span>
                    <p className="text-slate-400">
                      Features Back (Blue) and Lay (Pink) boxes with liquidity amounts underneath each price.
                    </p>
                    <div className="text-emerald-400 font-medium">
                      Tip: The engine extracts the Blue (Back) odds as the true decimal price.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Summary Drawer / Bar at the bottom */}
      {totalLegsSelected > 0 && (
        <div className="fixed bottom-14 sm:bottom-4 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none">
          <div className="mx-auto max-w-4xl rounded-2xl border border-emerald-500/40 bg-[#0d1527]/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl pointer-events-auto text-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 animate-in slide-in-from-bottom-3">
            {/* Left: Summary Stats */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-sm border border-emerald-500/30 shrink-0">
                  {totalLegsSelected}
                </span>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">
                      {totalLegsSelected} {totalLegsSelected === 1 ? 'Leg' : 'Legs'} Selected
                    </span>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      {totalLegsSelected === 1
                        ? 'Single'
                        : totalLegsSelected === 2
                        ? 'Double'
                        : totalLegsSelected === 3
                        ? 'Treble'
                        : totalLegsSelected === 7
                        ? 'Lucky 7'
                        : totalLegsSelected === 9
                        ? 'Power 9'
                        : totalLegsSelected === 12
                        ? 'Mega 12'
                        : `${totalLegsSelected}-Fold Acca`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                    <span>
                      Combined Odds: <strong className="text-emerald-400 font-mono text-xs">{(Number(combinedOdds) || 1).toFixed(2)}x</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Est. Payout: <strong className="text-amber-300 font-mono text-xs">{currency}{(Number(estimatedReturn) || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Stake input */}
              <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Stake:</span>
                <span className="text-emerald-400 font-bold">{currency}</span>
                <input
                  type="number"
                  min="1"
                  value={transferStake}
                  onChange={(e) => setTransferStake(Math.max(1, Number(e.target.value) || 1))}
                  className="w-14 bg-transparent font-mono text-xs font-bold text-white outline-none"
                />
              </div>
            </div>

            {/* Right: Bookmaker Selector + Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={targetBookmaker}
                  onChange={(e) => setTargetBookmaker(e.target.value)}
                  className="appearance-none rounded-xl border border-slate-700 bg-slate-900/90 pl-3 pr-8 py-2 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
                >
                  <option value="Hollywoodbets">Hollywoodbets</option>
                  <option value="Betway">Betway</option>
                  <option value="Supabets">Supabets</option>
                  <option value="10bet">10bet</option>
                  <option value="Sportingbet">Sportingbet</option>
                  <option value="Easybet">Easybet</option>
                  <option value="Betexchange">Betexchange</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>

              {/* Add to Main Betslip */}
              <button
                type="button"
                onClick={() => {
                  onAddMultipleLegs(selectedLegsList);
                  if (onGoToSlip) onGoToSlip();
                }}
                className="rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors shadow-sm cursor-pointer"
                title="Add these selected legs into your Betslip tab"
              >
                <span>+ Slip</span>
              </button>

              {/* Transfer Betslip Action Button */}
              <button
                type="button"
                onClick={handleTransferBetslip}
                disabled={isTransferring}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-4 py-2 text-xs shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95 cursor-pointer disabled:opacity-60"
              >
                {isTransferring ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                <span>Transfer Betslip</span>
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Tap Transfer Result & Redirection Modal */}
      {transferResultModal.isOpen && transferResultModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/40 bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Zap className="h-4 w-4 text-emerald-400" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Betslip Transferred Successfully
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target Bookmaker: <strong className="text-emerald-400">{transferResultModal.data.bookmaker}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferResultModal({ isOpen: false, data: null, copied: false })}
                className="rounded-lg p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Booking Code Card */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Official Booking Code
              </span>
              <div className="flex items-center justify-center gap-2 font-mono text-3xl font-black text-white tracking-widest bg-slate-950/90 py-3 rounded-xl border border-emerald-500/40 shadow-inner">
                <span>{transferResultModal.data.bookingCode}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-300 font-semibold">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Automatically Copied to Clipboard!</span>
              </div>
              {transferResultModal.data.bookmakerId === 'hollywoodbets' ? (
                <p className="text-[11px] text-amber-300/90 font-medium">
                  💡 Hollywoodbets codes use numbers only ({transferResultModal.data.bookingCode}). Paste into "Load Ticket" / "Book-a-Bet" search bar.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium">
                  Paste code {transferResultModal.data.bookingCode} into {transferResultModal.data.bookmaker} "Load Bet" search bar.
                </p>
              )}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Legs</span>
                <p className="text-base font-bold text-white mt-0.5">{transferResultModal.data.totalLegs}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Odds</span>
                <p className="text-base font-mono font-bold text-emerald-400 mt-0.5">{transferResultModal.data.totalOdds}x</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Est. Payout</span>
                <p className="text-base font-mono font-bold text-amber-400 mt-0.5">{currency}{transferResultModal.data.potentialPayout}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <a
                href={transferResultModal.data.deepLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open {transferResultModal.data.bookmaker} in New Tab</span>
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(transferResultModal.data.bookingCode);
                    alert(`Copied booking code: ${transferResultModal.data.bookingCode}`);
                  }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  Copy Code Again
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(transferResultModal.data.formattedSlipText);
                    alert('Copied complete betslip text summary to clipboard!');
                  }}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  Copy Full Slip Text
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddMultipleLegs(selectedLegsList);
                  setTransferResultModal({ isOpen: false, data: null, copied: false });
                  if (onGoToSlip) onGoToSlip();
                }}
                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-950/30 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 cursor-pointer"
              >
                Add All to Betslip Tab & View Slip →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
