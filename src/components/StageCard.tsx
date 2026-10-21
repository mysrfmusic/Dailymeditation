import React from 'react';
import { MeditationStageConfig } from '../types/meditation';
import { ThemeConfig } from '../utils/theme';
import { Youtube } from 'lucide-react';

interface StageCardProps {
  stage: MeditationStageConfig;
  stageIndex?: number;
  isSelected: boolean;
  theme: ThemeConfig;
  onSelect: () => void;
  onOpenInfo: (e: React.MouseEvent) => void;
}

export const StageCard: React.FC<StageCardProps> = ({
  stage,
  stageIndex,
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
      ? 'Post Hong-Sau'
      : stage.id === 'presence_om'
      ? 'Post Om'
      : stage.id === 'presence_kriya'
      ? 'Post Kriyas'
      : '';

  const displayTitle = isPresence ? 'Presence' : stage.title;
  const isPlayUntil = Boolean(stage.playUntilFinished || stage.customMedia?.playUntilFinished);

  const displayValue =
    stage.isCountBased && stage.kriyaCount !== undefined
      ? `${stage.kriyaCount}`
      : stage.isCountBased && stage.breathRounds !== undefined
      ? `${stage.breathRounds}`
      : isPlayUntil
      ? `🎵`
      : `${stage.minutes}m`;

  const unitLabel =
    stage.isCountBased && stage.kriyaCount !== undefined
      ? 'kriyas'
      : stage.isCountBased && stage.breathRounds !== undefined
      ? 'counts'
      : isPlayUntil
      ? 'auto'
      : 'mins';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${stage.title}, ${displayValue}`}
      className={`relative w-full rounded-xl sm:rounded-2xl p-1.5 sm:p-2 flex flex-col items-center justify-between min-h-[66px] sm:min-h-[74px] transition-all duration-150 cursor-pointer text-center select-none active:scale-[0.97] ${
        isSelected ? theme.cardSelected : theme.cardDefault
      }`}
    >
      {/* Top Row: Sequence Index and Info / Media */}
      <div className="w-full flex items-center justify-between text-[10px] leading-none px-0.5">
        <span
          className={`font-mono text-[9px] sm:text-[10px] font-bold ${
            isSelected ? 'opacity-90' : 'opacity-70'
          }`}
        >
          {stageIndex !== undefined ? String(stageIndex).padStart(2, '0') : ''}
        </span>

        <div className="flex items-center gap-1">
          {stage.customMedia?.enabled && stage.customMedia.url && (
            <span
              className="text-red-400"
              title={`Media: ${stage.customMedia.title || 'Attached'}`}
            >
              <Youtube className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </span>
          )}

          <span
            role="button"
            tabIndex={0}
            aria-label={`Technique info for ${stage.title}`}
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
            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-serif italic cursor-pointer hover:scale-110 active:scale-90 transition-transform ${
              isSelected
                ? 'bg-black/20 text-current hover:bg-black/30'
                : 'bg-white/10 text-current hover:bg-white/20'
            }`}
            title="Technique Details"
          >
            i
          </span>
        </div>
      </div>

      {/* Center: Big Value & Subtitle */}
      <div className="my-auto flex flex-col items-center justify-center leading-tight">
        <div className="font-extrabold tracking-tight leading-none font-spiritual text-lg sm:text-2xl">
          {displayValue}
        </div>
        <div className="text-[8.5px] sm:text-[9.5px] uppercase font-mono tracking-wider opacity-75">
          {unitLabel}
        </div>
      </div>

      {/* Bottom: Stage Title & Sub-detail */}
      <div className="w-full leading-tight">
        <div className="font-bold text-[10px] sm:text-[11.5px] truncate px-0.5">
          {displayTitle}
        </div>

        {isPresence && presenceLabel ? (
          <div className="text-[8px] sm:text-[9px] opacity-80 truncate">
            {presenceLabel}
          </div>
        ) : isBreathing && stage.breathPattern ? (
          <div className="text-[8px] sm:text-[9px] font-mono opacity-80 truncate">
            {stage.breathPattern.inhale}·{stage.breathPattern.hold}·{stage.breathPattern.exhale}
          </div>
        ) : null}
      </div>
    </button>
  );
};
