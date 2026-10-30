import React, { useState, useEffect } from 'react';
import { MeditationStageConfig } from '../types/meditation';
import { SOUNDSCAPES, SoundscapeType, soundEngine } from '../utils/soundscapes';
import { Volume2, VolumeX, Bell, Play, Square, Check, X } from 'lucide-react';

interface SoundscapeSelectorModalProps {
  isOpen: boolean;
  stage: MeditationStageConfig;
  onClose: () => void;
  onSaveStageConfig: (updated: Partial<MeditationStageConfig>) => void;
  onApplyToAllStages: (soundscape: SoundscapeType, volume: number) => void;
}

export const SoundscapeSelectorModal: React.FC<SoundscapeSelectorModalProps> = ({
  isOpen,
  stage,
  onClose,
  onSaveStageConfig,
  onApplyToAllStages,
}) => {
  const [selectedSound, setSelectedSound] = useState<SoundscapeType>(stage.soundscape);
  const [volume, setVolume] = useState<number>(stage.soundscapeVolume ?? 0.65);
  const [bellAtStart, setBellAtStart] = useState<boolean>(stage.bellAtStart);
  const [bellAtEnd, setBellAtEnd] = useState<boolean>(stage.bellAtEnd);
  const [intervalBell, setIntervalBell] = useState<number>(stage.intervalBellMinutes ?? 0);
  const [previewing, setPreviewing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedSound(stage.soundscape);
      setVolume(stage.soundscapeVolume ?? 0.65);
      setBellAtStart(stage.bellAtStart);
      setBellAtEnd(stage.bellAtEnd);
      setIntervalBell(stage.intervalBellMinutes ?? 0);
    } else {
      // stop any preview sound
      if (previewing) {
        soundEngine.stopSoundscape();
        setPreviewing(false);
      }
    }
  }, [isOpen, stage]);

  if (!isOpen) return null;

  const handleTogglePreview = (id: SoundscapeType) => {
    if (previewing && selectedSound === id) {
      soundEngine.stopSoundscape();
      setPreviewing(false);
    } else {
      setSelectedSound(id);
      soundEngine.setVolume(volume);
      soundEngine.playSoundscape(id);
      setPreviewing(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    soundEngine.setVolume(newVol);
  };

  const handleTestBell = () => {
    soundEngine.playTempleBell(1);
  };

  const handleSave = () => {
    if (previewing) {
      soundEngine.stopSoundscape();
      setPreviewing(false);
    }
    onSaveStageConfig({
      soundscape: selectedSound,
      soundscapeVolume: volume,
      bellAtStart,
      bellAtEnd,
      intervalBellMinutes: intervalBell,
    });
    onClose();
  };

  const handleApplyAll = () => {
    if (previewing) {
      soundEngine.stopSoundscape();
      setPreviewing(false);
    }
    onApplyToAllStages(selectedSound, volume);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="soundscape-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-[#fff8eb] border-2 border-[#7a1215] rounded-[24px] sm:rounded-[28px] shadow-2xl p-4 sm:p-6 max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-amber-900/20">
          <div>
            <h2 id="soundscape-title" className="text-2xl font-bold text-[#7a1215] font-spiritual">
              Soundscape for {stage.title}
            </h2>
            <p className="text-xs text-amber-900/80 mt-0.5">
              Choose an ambient soundscape and customize bell chimes for this session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (previewing) {
                soundEngine.stopSoundscape();
                setPreviewing(false);
              }
              onClose();
            }}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full flex items-center justify-center text-amber-900 hover:bg-amber-900/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Slider & Bell Test */}
        <div className="mt-4 p-3.5 bg-amber-100/60 rounded-2xl border border-amber-300/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#7a1215]">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              Soundscape Volume: {Math.round(volume * 100)}%
            </span>
            <button
              type="button"
              onClick={handleTestBell}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[#7a1215] text-white hover:bg-[#92181c] transition-colors"
            >
              <Bell className="w-3 h-3" /> Test Temple Bell
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Soundscape Volume"
            className="w-full accent-[#7a1215]"
          />
        </div>

        {/* Soundscape Options List */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-900/70 mb-1">
            Available Soundscapes
          </div>
          {SOUNDSCAPES.map((item) => {
            const isSelected = selectedSound === item.id;
            const isPlayingThis = previewing && isSelected;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedSound(item.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#7a1215] text-white border-[#54080a] shadow-md'
                    : 'bg-white hover:bg-amber-50 text-amber-950 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl select-none">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm sm:text-base leading-snug flex items-center gap-2">
                      <span className="truncate">{item.name}</span>
                      {isSelected && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-white font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs truncate ${
                        isSelected ? 'text-amber-100/90' : 'text-amber-900/70'
                      }`}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Preview Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePreview(item.id);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                      isPlayingThis
                        ? 'bg-amber-300 text-[#7a1215] font-bold shadow'
                        : isSelected
                        ? 'bg-white/20 text-white hover:bg-white/30'
                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                    }`}
                  >
                    {isPlayingThis ? (
                      <>
                        <Square className="w-3 h-3 fill-current" /> Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" /> Preview
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bell & Chimes Configuration */}
        <div className="mt-5 p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-900/80 mb-2 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Chime Notifications
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-amber-950">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bellAtStart}
                onChange={(e) => setBellAtStart(e.target.checked)}
                className="rounded accent-[#7a1215] w-4 h-4 cursor-pointer"
              />
              <span>Bell at start</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bellAtEnd}
                onChange={(e) => setBellAtEnd(e.target.checked)}
                className="rounded accent-[#7a1215] w-4 h-4 cursor-pointer"
              />
              <span>Bell at end</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-amber-900/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleApplyAll}
            className="w-full sm:w-auto text-xs font-semibold text-[#7a1215] hover:text-[#92181c] underline cursor-pointer"
          >
            Apply soundscape to all 9 sessions
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (previewing) soundEngine.stopSoundscape();
                onClose();
              }}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-100 rounded-full hover:bg-amber-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-[#7a1215] hover:bg-[#92181c] rounded-full shadow transition-all"
            >
              Save Soundscape
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
