import React from 'react';
import { MeditationStageConfig } from '../types/meditation';
import { ThemeConfig } from '../utils/theme';

interface StageCardProps {
  stage: MeditationStageConfig;
  isSelected: boolean;
  theme: ThemeConfig;
  onSelect: () => void;
  onOpenInfo: (e: React.MouseEvent) => void;
}

export const StageCard: React.FC<StageCardProps> = ({
  stage,
  isSelected,
  theme,
  onSelect,
  onOpenInfo,
}) => {
  const isBreathing = Boolean(stage.breathPattern);
  const isPresence =
    stage.id === 'presence_hong_sau' ||
    stage.id === 'presence_om' ||
    stage.id === 'presence_kriya';

  const presenceLabel =
    stage.id === 'presence_hong_sau'
      ? 'After Hong-Sau'
      : stage.id === 'presence_om'
      ? 'After Om'
      : stage.id === 'presence_kriya'
      ? 'After Kriyas'
      : '';

  const displayTitle = isPresence ? 'Presence' : stage.title;

  const displayValue =
    stage.isCountBased && stage.kriyaCount !== undefined
      ? `${stage.kriyaCount}`
      : stage.isCountBased && stage.breathRounds !== undefined
      ? `${stage.breathRounds}`
      : `${stage.minutes}‘`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${stage.title}, ${displayValue}`}
      className={`relative w-full aspect-square rounded-[20px] p-2 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer text-center select-none active:scale-[0.98] ${
        isSelected ? theme.cardSelected : theme.cardDefault
      }`}
    >
      {/* Top Left Info (i) Icon */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Technique details for ${stage.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onOpenInfo(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onOpenInfo(e as unknown as React.MouseEvent);
          }
        }}
        className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-serif italic cursor-pointer transition-transform hover:scale-110 active:scale-95 border ${
          isSelected
            ? 'text-white/90 hover:text-white border-white/40 bg-white/10'
            : 'text-current/70 hover:text-current border-current/40 bg-black/10'
        }`}
        title="Technique, Guidelines & Prayer"
      >
        i
      </div>

      {/* Top Right Custom Media Indicator (YouTube / MP3) */}
      {stage.customMedia?.enabled && stage.customMedia.url && (
        <div
          className={`absolute top-1.5 right-1.5 px-1 py-0.2 rounded-full text-[9px] font-bold flex items-center gap-0.5 border shadow-sm ${
            stage.customMedia.type === 'youtube' || stage.customMedia.url.includes('youtu')
              ? 'bg-red-600/80 text-white border-red-400/80'
              : 'bg-sky-600/80 text-white border-sky-400/80'
          }`}
          title={`Custom Media Active: ${stage.customMedia.title || stage.customMedia.url}`}
        >
          <span>{stage.customMedia.type === 'youtube' || stage.customMedia.url.includes('youtu') ? '▶' : '🎵'}</span>
        </div>
      )}

      {/* Main Number Display (Counts for Kriyas and Breathing, or Minutes for time stages) */}
      <div className="font-extrabold tracking-tight leading-none mt-1 font-spiritual text-3xl sm:text-4xl">
        {displayValue}
      </div>

      {/* Stage Title */}
      <div className="mt-1 font-semibold text-xs sm:text-[13px] leading-tight px-0.5 max-w-full truncate">
        {displayTitle}
      </div>

      {/* For Presence: Show 'After Hong-Sau' / 'After Om' / 'After Kriyas' */}
      {isPresence && (
        <span className="text-[9px] sm:text-[10px] font-medium opacity-90 leading-tight mt-0.5 px-1.5 py-0.5 rounded-full bg-black/25 truncate max-w-[95%]">
          {presenceLabel}
        </span>
      )}

      {/* For Breathing: Show ratio badge below (e.g. 6·6·6 or 8·8·8) */}
      {isBreathing && stage.breathPattern && (
        <span className="text-[10px] opacity-80 font-mono leading-none mt-0.5 px-1.5 py-0.5 rounded bg-black/20">
          {stage.breathPattern.inhale}·{stage.breathPattern.hold}·{stage.breathPattern.exhale}
        </span>
      )}
    </button>
  );
};
