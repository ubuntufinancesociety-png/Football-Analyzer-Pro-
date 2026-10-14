import React, { useState } from 'react';
import {
  DetectedBoundingBoxItem,
  BoundingBox,
} from '../types/betslip';
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Filter,
  Layers,
  Sparkles,
  Maximize2,
  ZoomIn,
  Info,
  Sliders,
} from 'lucide-react';

export interface VisualDebuggerOverlayProps {
  imageUrl: string;
  boundingBoxes: DetectedBoundingBoxItem[];
  selectedFilter: 'all' | 'odds' | 'teams' | 'cards' | 'warnings';
  onSelectFilter: (filter: 'all' | 'odds' | 'teams' | 'cards' | 'warnings') => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  showLabels: boolean;
  onToggleLabels: (show: boolean) => void;
  hoveredBoxId: string | null;
  onHoverBox: (id: string | null) => void;
  selectedBoxId: string | null;
  onSelectBox: (id: string | null) => void;
  highlightedMatchId?: string | null;
  className?: string;
  isInteractive?: boolean;
}

export const VisualDebuggerOverlay: React.FC<VisualDebuggerOverlayProps> = ({
  imageUrl,
  boundingBoxes,
  selectedFilter,
  onSelectFilter,
  opacity,
  onOpacityChange,
  showLabels,
  onToggleLabels,
  hoveredBoxId,
  onHoverBox,
  selectedBoxId,
  onSelectBox,
  highlightedMatchId,
  className = '',
  isInteractive = true,
}) => {
  const [activeTooltipBox, setActiveTooltipBox] = useState<DetectedBoundingBoxItem | null>(null);

  // Filter boxes according to user filter
  const filteredBoxes = boundingBoxes.filter((box) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'odds') {
      return box.type === 'home_odds' || box.type === 'draw_odds' || box.type === 'away_odds';
    }
    if (selectedFilter === 'teams') {
      return box.type === 'home_team' || box.type === 'away_team';
    }
    if (selectedFilter === 'cards') {
      return box.type === 'match_row' || box.type === 'league' || box.type === 'bookmaker_header';
    }
    if (selectedFilter === 'warnings') {
      return Boolean(box.isWarning);
    }
    return true;
  });

  const oddsCount = boundingBoxes.filter(
    (b) => b.type === 'home_odds' || b.type === 'draw_odds' || b.type === 'away_odds'
  ).length;
  const teamsCount = boundingBoxes.filter(
    (b) => b.type === 'home_team' || b.type === 'away_team'
  ).length;
  const cardsCount = boundingBoxes.filter((b) => b.type === 'match_row').length;
  const warningsCount = boundingBoxes.filter((b) => b.isWarning).length;

  const getBoxColorClasses = (box: DetectedBoundingBoxItem, isHovered: boolean, isSelected: boolean) => {
    if (box.isWarning) {
      return {
        border: 'border-rose-500 shadow-rose-500/50',
        bg: 'bg-rose-500/25',
        badge: 'bg-rose-950 text-rose-300 border-rose-500',
        title: '⚠️ Layout Warning',
      };
    }

    switch (box.type) {
      case 'home_odds':
        return {
          border: 'border-emerald-400 shadow-emerald-500/40',
          bg: 'bg-emerald-500/20',
          badge: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
          title: '1 (Home Win Odds)',
        };
      case 'draw_odds':
        return {
          border: 'border-amber-400 shadow-amber-500/40',
          bg: 'bg-amber-500/20',
          badge: 'bg-amber-950 text-amber-300 border-amber-500/40',
          title: 'X / × (Draw Odds)',
        };
      case 'away_odds':
        return {
          border: 'border-cyan-400 shadow-cyan-500/40',
          bg: 'bg-cyan-500/20',
          badge: 'bg-cyan-950 text-cyan-300 border-cyan-500/40',
          title: '2 (Away Win Odds)',
        };
      case 'home_team':
        return {
          border: 'border-violet-400 shadow-violet-500/30',
          bg: 'bg-violet-500/15',
          badge: 'bg-violet-950 text-violet-300 border-violet-500/40',
          title: 'Home Team',
        };
      case 'away_team':
        return {
          border: 'border-fuchsia-400 shadow-fuchsia-500/30',
          bg: 'bg-fuchsia-500/15',
          badge: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-500/40',
          title: 'Away Team',
        };
      case 'league':
        return {
          border: 'border-sky-400 shadow-sky-500/30',
          bg: 'bg-sky-500/15',
          badge: 'bg-sky-950 text-sky-300 border-sky-500/40',
          title: 'League Header',
        };
      case 'bookmaker_header':
        return {
          border: 'border-yellow-400 shadow-yellow-500/30',
          bg: 'bg-yellow-500/20',
          badge: 'bg-yellow-950 text-yellow-300 border-yellow-500/40',
          title: 'Bookmaker Banner',
        };
      case 'match_row':
      default:
        return {
          border: 'border-indigo-400/80 border-dashed shadow-indigo-500/20',
          bg: 'bg-indigo-950/15',
          badge: 'bg-slate-900 text-indigo-300 border-indigo-500/40',
          title: 'Match Card Row',
        };
    }
  };

  const selectedBoxDetails = boundingBoxes.find((b) => b.id === (hoveredBoxId || selectedBoxId));

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {/* Visual Debugger Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 text-xs">
        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="h-3 w-3 text-emerald-400" />
            <span>Filter Boxes:</span>
          </span>

          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              selectedFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            All ({boundingBoxes.length})
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('odds')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              selectedFilter === 'odds'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>1X2 Odds ({oddsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('teams')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              selectedFilter === 'teams'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span>Teams ({teamsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectFilter('cards')}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
              selectedFilter === 'cards'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span>Match Rows ({cardsCount})</span>
          </button>

          {warningsCount > 0 && (
            <button
              type="button"
              onClick={() => onSelectFilter('warnings')}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                selectedFilter === 'warnings'
                  ? 'bg-rose-500 text-white font-bold shadow-sm'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-800/60 hover:bg-rose-900/50'
              }`}
            >
              <AlertCircle className="h-3 w-3 text-rose-400" />
              <span>Warnings ({warningsCount})</span>
            </button>
          )}
        </div>

        {/* View Options: Labels toggle & Opacity */}
        <div className="flex items-center gap-3 ml-auto">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => onToggleLabels(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
            />
            <span>Show Labels</span>
          </label>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Opacity:</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded-lg accent-emerald-500 cursor-pointer"
            />
            <span className="font-mono text-[10px] w-6">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Main Preview Container with Image & Bounding Box Overlay */}
      <div className="relative w-full rounded-2xl border border-slate-800 bg-[#070b14] p-2 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
        <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-inner">
          {/* Base Screenshot Image */}
          <img
            src={imageUrl}
            alt="Detected Layout Screenshot"
            className="w-full h-auto object-contain block rounded-xl select-none"
            style={{ maxHeight: '72vh' }}
          />

          {/* Interactive Bounding Box Overlay */}
          <div
            className="absolute inset-0 pointer-events-auto"
            style={{ opacity }}
            onMouseLeave={() => {
              onHoverBox(null);
              setActiveTooltipBox(null);
            }}
          >
            {filteredBoxes.map((box) => {
              const isHovered = hoveredBoxId === box.id;
              const isSelected = selectedBoxId === box.id;
              const isMatchHighlighted = highlightedMatchId && box.matchId === highlightedMatchId;
              const styles = getBoxColorClasses(box, isHovered, isSelected);

              // Percentage conversion from 0..1000 normalized coordinates
              const top = `${box.box.ymin / 10}%`;
              const left = `${box.box.xmin / 10}%`;
              const height = `${Math.max(1.8, (box.box.ymax - box.box.ymin) / 10)}%`;
              const width = `${Math.max(2.5, (box.box.xmax - box.box.xmin) / 10)}%`;

              const isHighlighted = isHovered || isSelected || isMatchHighlighted;

              return (
                <div
                  key={box.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isInteractive) {
                      onSelectBox(isSelected ? null : box.id);
                      setActiveTooltipBox(isSelected ? null : box);
                    }
                  }}
                  onMouseEnter={() => {
                    if (isInteractive) {
                      onHoverBox(box.id);
                      setActiveTooltipBox(box);
                    }
                  }}
                  className={`absolute rounded transition-all cursor-pointer ${styles.border} ${styles.bg} ${
                    isHighlighted
                      ? 'border-2 shadow-lg ring-2 ring-white/60 z-20 scale-[1.01]'
                      : 'border z-10 hover:border-2'
                  }`}
                  style={{
                    top,
                    left,
                    height,
                    width,
                  }}
                >
                  {/* Identified Label Badge */}
                  {showLabels && (
                    <div
                      className={`absolute -top-3.5 left-0.5 truncate max-w-[92%] rounded px-1 py-0.2 text-[9px] font-bold font-mono border shadow-md select-none pointer-events-none ${
                        styles.badge
                      } ${isHighlighted ? 'scale-110 z-30 ring-1 ring-white/50' : 'opacity-90'}`}
                      style={{ lineHeight: '12px' }}
                    >
                      {box.label}
                    </div>
                  )}

                  {/* Warning Indicator Icon */}
                  {box.isWarning && (
                    <div className="absolute top-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[8px] font-bold shadow animate-pulse">
                      !
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Inspector Popover Panel */}
        {selectedBoxDetails && (
          <div className="mt-3 w-full max-w-2xl rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 text-xs shadow-xl animate-in fade-in space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-bold text-white text-xs">
                  {selectedBoxDetails.label}
                </span>
                <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  {selectedBoxDetails.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedBoxDetails.confidence && (
                  <span className="text-[11px] font-mono font-bold text-slate-300">
                    Confidence: {selectedBoxDetails.confidence}%
                  </span>
                )}
                {selectedBoxDetails.isWarning ? (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-950 border border-rose-500/50 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                    <AlertCircle className="h-3 w-3" />
                    <span>Layout Warning</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-950 border border-emerald-500/50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    <Check className="h-3 w-3" />
                    <span>Aligned ✓</span>
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 pt-1">
              <div>
                <span className="text-slate-500 block text-[10px]">Identified Value:</span>
                <span className="font-semibold text-white">
                  {selectedBoxDetails.value !== undefined ? String(selectedBoxDetails.value) : selectedBoxDetails.label}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Box Normalized (0-1000):</span>
                <span className="font-mono text-[10px] text-emerald-400">
                  [{selectedBoxDetails.box.ymin}, {selectedBoxDetails.box.xmin}, {selectedBoxDetails.box.ymax}, {selectedBoxDetails.box.xmax}]
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Element ID:</span>
                <span className="font-mono text-[10px] text-slate-400 truncate block">
                  {selectedBoxDetails.id}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Associated Match:</span>
                <span className="text-slate-300 truncate block">
                  {selectedBoxDetails.matchId || 'General Layout'}
                </span>
              </div>
            </div>

            {selectedBoxDetails.warningNote && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/40 rounded p-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{selectedBoxDetails.warningNote}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend & Layout Diagnostic Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 px-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-500 font-semibold">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">1 (Home Win)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-slate-300">X (Draw)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300">2 (Away Win)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-slate-300">Teams</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className="text-slate-300">Match Card</span>
          </span>
        </div>

        <div className="text-slate-500 text-[10px]">
          Hover or tap any bounding box to inspect OCR coordinates and field alignment.
        </div>
      </div>
    </div>
  );
};
