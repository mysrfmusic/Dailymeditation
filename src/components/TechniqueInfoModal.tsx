import React from 'react';
import { MeditationStageConfig } from '../types/meditation';
import { SOUNDSCAPES } from '../utils/soundscapes';
import { X, BookOpen, Sparkles, Compass, HeartHandshake } from 'lucide-react';

interface TechniqueInfoModalProps {
  stage: MeditationStageConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onStartThisStage: (stage: MeditationStageConfig) => void;
  onOpenCustomMedia?: (stage: MeditationStageConfig) => void;
}

export const TechniqueInfoModal: React.FC<TechniqueInfoModalProps> = ({
  stage,
  isOpen,
  onClose,
  onStartThisStage,
  onOpenCustomMedia,
}) => {
  if (!isOpen || !stage) return null;

  const currentSound = SOUNDSCAPES.find((s) => s.id === stage.soundscape) || SOUNDSCAPES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="technique-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#0f172a] text-slate-100 border border-amber-400/40 rounded-[28px] shadow-2xl p-6 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-700/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center text-xs font-serif font-bold italic border border-amber-400/30">
                i
              </span>
              <h2 id="technique-modal-title" className="text-2xl font-bold text-amber-300 font-spiritual">
                {stage.title}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {stage.subtitle} · Duration: {stage.isCountBased ? `${stage.kriyaCount} Kriyas (${stage.minutes}m)` : `${stage.minutes} minutes`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-200">
          {/* Sacred Prayer Words (if stage has prayerText) */}
          {stage.techniqueGuide.prayerText && (
            <div className="p-4 bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-400/40 rounded-2xl shadow-inner">
              <div className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-amber-300" /> Sacred Words / Prayer
              </div>
              <p className="leading-relaxed text-amber-100 italic text-sm sm:text-base font-serif">
                {stage.techniqueGuide.prayerText}
              </p>
            </div>
          )}

          {/* Summary / Purpose */}
          <div className="bg-slate-800/70 p-3.5 rounded-2xl border border-slate-700/60">
            <div className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Purpose & Benefit
            </div>
            <p className="leading-relaxed text-slate-300">{stage.techniqueGuide.purpose}</p>
          </div>

          {/* Posture */}
          <div>
            <div className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" /> Posture
            </div>
            <p className="leading-relaxed text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
              {stage.techniqueGuide.posture}
            </p>
          </div>

          {/* Step by Step Instructions */}
          <div>
            <div className="font-bold text-amber-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Practice Guidelines
            </div>
            <ul className="space-y-2">
              {stage.techniqueGuide.instructions.map((inst, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/50"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-amber-400/30">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed text-slate-200">{inst}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Sacred Quote */}
          {stage.techniqueGuide.sacredQuote && (
            <div className="p-3.5 bg-amber-950/20 rounded-2xl border-l-4 border-amber-400 italic text-amber-200 text-xs sm:text-[13px] leading-relaxed">
              {stage.techniqueGuide.sacredQuote}
            </div>
          )}

          {/* Soundscape Note */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl text-xs text-slate-300 border border-slate-700/40">
            <span className="font-medium">Assigned Soundscape:</span>
            <span className="font-bold text-amber-300 flex items-center gap-1">
              {currentSound.icon} {currentSound.name}
            </span>
          </div>

          {/* Custom YouTube / MP3 Note */}
          {stage.customMedia?.enabled && stage.customMedia.url ? (
            <div className="flex items-center justify-between p-3 bg-red-950/30 rounded-xl text-xs text-slate-300 border border-red-500/30">
              <div>
                <span className="font-medium text-red-300 block">Custom Media Audio:</span>
                <span className="text-[11px] text-slate-300 truncate max-w-[200px] block">
                  {stage.customMedia.title || stage.customMedia.url}
                </span>
              </div>
              {onOpenCustomMedia && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCustomMedia(stage);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-semibold border border-red-400/30 cursor-pointer"
                >
                  Edit Media
                </button>
              )}
            </div>
          ) : onOpenCustomMedia ? (
            <div className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded-xl text-xs text-slate-400 border border-slate-700/30">
              <span>YouTube / MP3: Default Soundscape</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCustomMedia(stage);
                }}
                className="text-amber-300 hover:text-amber-200 underline font-semibold text-[11px] cursor-pointer"
              >
                + Add Custom Audio/YouTube
              </button>
            </div>
          ) : null}
        </div>

        {/* Action Footer */}
        <div className="mt-5 pt-3 border-t border-slate-700/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartThisStage(stage);
            }}
            className="px-5 py-2 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-200 rounded-full shadow-lg transition-all"
          >
            Start {stage.title} Now
          </button>
        </div>
      </div>
    </div>
  );
};
