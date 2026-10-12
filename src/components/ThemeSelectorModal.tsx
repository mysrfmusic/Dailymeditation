import React from 'react';
import { AppTheme } from '../types/meditation';
import { THEMES } from '../utils/theme';
import { X, Check, Palette } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  currentTheme: AppTheme;
  onClose: () => void;
  onSelectTheme: (theme: AppTheme) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  currentTheme,
  onClose,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-md bg-[#0f172a] text-slate-100 border border-sky-400/30 rounded-[28px] shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-400/20 text-sky-300 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="text-xl font-bold text-slate-100 font-spiritual">
                Color & Visual Style
              </h2>
              <p className="text-xs text-slate-400">
                Choose an ambiance that fits your meditation environment
              </p>
            </div>
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

        {/* Themes List */}
        <div className="mt-4 space-y-3">
          {(Object.keys(THEMES) as AppTheme[]).map((themeKey) => {
            const item = THEMES[themeKey];
            const isSelected = currentTheme === themeKey;

            return (
              <button
                key={themeKey}
                type="button"
                onClick={() => {
                  onSelectTheme(themeKey);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-lg ring-1 ring-sky-400/50'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border-slate-700/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none">{item.badge}</span>
                  <div>
                    <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                      <span>{item.name}</span>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-400/30 text-sky-200">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{item.subtitle}</div>
                  </div>
                </div>

                {isSelected && <Check className="w-5 h-5 text-sky-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-700/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-900 bg-sky-400 hover:bg-sky-300 rounded-full shadow transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
