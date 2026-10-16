import React, { useState } from 'react';
import { MeditationStageConfig, StageId } from '../types/meditation';
import {
  STAGE_MEDIA_PRESETS,
  StageMediaPreset,
  AFFIRMATION_PRESETS,
  SACRED_VOICE_PRESETS,
  cleanAndCanonicalizeYouTubeUrl,
  fetchYouTubeVideoMetadata,
} from '../utils/customMedia';
import {
  createChantStage,
  createAffirmationStage,
  createSacredVoicesStage,
} from '../data/stages';
import {
  Music,
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Youtube,
  Check,
  ListOrdered,
  X,
  Mic,
} from 'lucide-react';
import { ThemeConfig } from '../utils/theme';

interface ChantAffirmationTabProps {
  isOpen: boolean;
  stages: Record<string, MeditationStageConfig>;
  sequenceOrder: string[];
  theme: ThemeConfig;
  onClose: () => void;
  onAddStage: (stage: MeditationStageConfig, insertIndex?: number) => void;
  onRemoveStage: (stageId: string) => void;
  onReorderSequence: (newOrder: string[]) => void;
  onUpdateStageConfig: (stageId: string, updates: Partial<MeditationStageConfig>) => void;
  onSelectStage: (stageId: string) => void;
}

export const ChantAffirmationTab: React.FC<ChantAffirmationTabProps> = ({
  isOpen,
  stages,
  sequenceOrder,
  theme,
  onClose,
  onAddStage,
  onRemoveStage,
  onReorderSequence,
  onUpdateStageConfig,
  onSelectStage,
}) => {
  const [activeTab, setActiveTab] = useState<'chants' | 'affirmations' | 'sacred_voices' | 'custom' | 'sequence'>('chants');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customType, setCustomType] = useState<'chant' | 'affirmation' | 'sacred_voices'>('chant');
  const [customMinutes, setCustomMinutes] = useState<number>(5);
  const [customPlayUntilFinished, setCustomPlayUntilFinished] = useState<boolean>(true);
  const [customText, setCustomText] = useState<string>('');
  const [addedSuccessMessage, setAddedSuccessMessage] = useState<string | null>(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);

  // Drag and drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setAddedSuccessMessage(msg);
    setTimeout(() => {
      setAddedSuccessMessage(null);
    }, 2800);
  };

  const handleAutoCorrectUrl = async () => {
    if (!customUrl.trim()) return;
    setIsResolvingUrl(true);
    try {
      const canonical = cleanAndCanonicalizeYouTubeUrl(customUrl.trim());
      setCustomUrl(canonical);
      const meta = await fetchYouTubeVideoMetadata(canonical);
      if (meta.title) {
        setCustomTitle(meta.title);
        showNotification(`Corrected link & fetched: "${meta.title}"`);
      } else {
        showNotification('Cleaned link to standard YouTube format!');
      }
    } catch {
      showNotification('Cleaned link to standard YouTube format.');
    } finally {
      setIsResolvingUrl(false);
    }
  };

  const handleAddPresetChant = (preset: StageMediaPreset, minutes: number = 5) => {
    const uniqueId = `chant_${Date.now()}`;
    const newStage = createChantStage(uniqueId, preset.title, preset.url, minutes);
    newStage.subtitle = preset.subtitle;
    newStage.playUntilFinished = true;
    onAddStage(newStage);
    showNotification(`Added "${preset.title}" to Routine!`);
  };

  const handleAddPresetAffirmation = (preset: StageMediaPreset, minutes: number = 4) => {
    const uniqueId = `affirmation_${Date.now()}`;
    const newStage = createAffirmationStage(
      uniqueId,
      preset.title,
      preset.url,
      minutes,
      preset.affirmationText || preset.subtitle
    );
    newStage.subtitle = 'Scientific Healing Affirmation';
    newStage.playUntilFinished = true;
    onAddStage(newStage);
    showNotification(`Added "${preset.title}" to Routine!`);
  };

  const handleAddPresetSacredVoice = (preset: StageMediaPreset, minutes: number = 6) => {
    const uniqueId = `sacred_voices_${Date.now()}`;
    const newStage = createSacredVoicesStage(
      uniqueId,
      preset.title,
      preset.url,
      minutes,
      preset.affirmationText || preset.subtitle
    );
    newStage.subtitle = preset.subtitle;
    newStage.playUntilFinished = true;
    onAddStage(newStage);
    showNotification(`Added "${preset.title}" to Routine!`);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const sanitizedUrl = cleanAndCanonicalizeYouTubeUrl(customUrl.trim());
    const uniqueId = `${customType}_${Date.now()}`;
    const title =
      customTitle.trim() ||
      (customType === 'chant'
        ? 'Cosmic Chant'
        : customType === 'sacred_voices'
        ? 'Sacred Voice Talk'
        : 'Healing Affirmation');

    let newStage: MeditationStageConfig;
    if (customType === 'chant') {
      newStage = createChantStage(uniqueId, title, sanitizedUrl, customMinutes);
    } else if (customType === 'sacred_voices') {
      newStage = createSacredVoicesStage(uniqueId, title, sanitizedUrl, customMinutes, customText || undefined);
    } else {
      newStage = createAffirmationStage(uniqueId, title, sanitizedUrl, customMinutes, customText || undefined);
    }

    newStage.playUntilFinished = customPlayUntilFinished;
    if (newStage.customMedia) {
      newStage.customMedia.playUntilFinished = customPlayUntilFinished;
      if (customText) {
        newStage.customMedia.affirmationText = customText;
      }
    }

    onAddStage(newStage);
    setCustomTitle('');
    setCustomUrl('');
    setCustomText('');
    showNotification(`Added "${title}" to Routine!`);
  };

  // Reordering helpers (for both drag & drop and button arrows)
  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= sequenceOrder.length || fromIdx === toIdx) return;
    const next = [...sequenceOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onReorderSequence(next);
  };

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (draggedIdx !== null) {
      moveItem(draggedIdx, idx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chant-affirmation-tab-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-amber-400/35 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 id="chant-affirmation-tab-title" className="text-base sm:text-lg font-bold font-spiritual text-amber-200">
                Chants, Affirmations & Sacred Voices
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300/80">
                Add Cosmic Chants, Healing Affirmations, and Guru Voice talks to your routine sequence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-black/30 px-3 pt-2 gap-1 overflow-x-auto">
          {[
            { id: 'chants', label: 'Cosmic Chants', icon: <Music className="w-4 h-4" /> },
            { id: 'affirmations', label: 'Affirmations', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'sacred_voices', label: 'Sacred Voices', icon: <Mic className="w-4 h-4" /> },
            { id: 'custom', label: '+ Custom Link', icon: <Plus className="w-4 h-4" /> },
            { id: 'sequence', label: `Routine Sequence (${sequenceOrder.length})`, icon: <ListOrdered className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-t border-x ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-amber-300 border-amber-400/40 border-b-transparent shadow'
                  : 'text-slate-400 hover:text-white border-transparent hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Notification Toast */}
        {addedSuccessMessage && (
          <div className="bg-emerald-600/90 text-white text-xs font-semibold py-2 px-4 text-center animate-in slide-in-from-top duration-200 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-emerald-200" />
            <span>{addedSuccessMessage}</span>
          </div>
        )}

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: COSMIC CHANTS */}
          {activeTab === 'chants' && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-400/25 rounded-2xl p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
                <Music className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Paramahansa Yogananda Cosmic Chants:</span>
                  <p className="text-[11px] text-amber-100/80 mt-0.5">
                    Select any sacred chant below to add it into your sequence. By default, chants play until the sacred music is completed!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STAGE_MEDIA_PRESETS.chant?.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 bg-black/35 border border-white/10 hover:border-amber-400/50 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-amber-200 group-hover:text-amber-100 leading-tight">
                          {preset.title}
                        </span>
                        <a
                          href={preset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-red-400 p-0.5 transition-colors"
                          title="Preview on YouTube"
                        >
                          <Youtube className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-300/80 line-clamp-2 mt-1">
                        {preset.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] text-emerald-400 font-medium">
                        ✓ Plays till music ends
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddPresetChant(preset)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Routine
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: AFFIRMATIONS */}
          {activeTab === 'affirmations' && (
            <div className="space-y-3">
              <div className="bg-sky-500/10 border border-sky-400/25 rounded-2xl p-3 text-xs text-sky-200/90 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sky-300">Scientific Healing Affirmations:</span>
                  <p className="text-[11px] text-sky-100/80 mt-0.5">
                    Infuse mind and soul with cosmic vitality through Paramahansa Yogananda’s scientific affirmations. Easily add one or more into your sequence!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {AFFIRMATION_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 bg-black/35 border border-white/10 hover:border-sky-400/50 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-sky-200 group-hover:text-sky-100 leading-tight">
                          {preset.title}
                        </span>
                        <a
                          href={preset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-red-400 p-0.5 transition-colors"
                          title="Preview video"
                        >
                          <Youtube className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-300/80 italic line-clamp-3 mt-1.5 font-serif">
                        {preset.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] text-sky-400 font-medium">
                        ✓ Plays till music ends
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddPresetAffirmation(preset)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-sky-400 hover:bg-sky-300 text-slate-950 transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Routine
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SACRED VOICES */}
          {activeTab === 'sacred_voices' && (
            <div className="space-y-3">
              <div className="bg-purple-500/10 border border-purple-400/25 rounded-2xl p-3 text-xs text-purple-200/90 flex items-start gap-2.5">
                <Mic className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-purple-300">Sacred Voices of Paramahansa Yogananda & Direct Disciples:</span>
                  <p className="text-[11px] text-purple-100/80 mt-0.5">
                    Historic spoken voice recordings, divine invocations from Whispers from Eternity, and teachings by Sri Daya Mata and line of gurus. Direct attunement with the Master's vibration.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SACRED_VOICE_PRESETS.map((preset: StageMediaPreset) => (
                  <div
                    key={preset.id}
                    className="p-3 bg-black/35 border border-white/10 hover:border-purple-400/50 rounded-2xl flex flex-col justify-between gap-2.5 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-purple-200 group-hover:text-purple-100 leading-tight">
                          {preset.title}
                        </span>
                        <a
                          href={preset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-red-400 p-0.5 transition-colors"
                          title="Preview video"
                        >
                          <Youtube className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-300/80 mt-1">
                        {preset.subtitle}
                      </p>
                      {preset.affirmationText && (
                        <p className="text-[10.5px] text-amber-200/90 italic font-serif mt-1.5 line-clamp-3 bg-white/5 p-1.5 rounded-lg border border-white/5">
                          {preset.affirmationText}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] text-purple-300 font-medium">
                        ✓ Plays till audio ends
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddPresetSacredVoice(preset)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-400 hover:bg-purple-300 text-slate-950 transition-all active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Routine
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOM AUDIO LINK */}
          {activeTab === 'custom' && (
            <form onSubmit={handleAddCustom} className="space-y-4 max-w-lg mx-auto">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/10 space-y-3">
                <span className="text-xs font-bold text-amber-300 block">
                  Add Your Own Chant, Affirmation, or Sacred Voice Link
                </span>

                {/* Type Selection */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomType('chant')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all text-center ${
                      customType === 'chant'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-black/20 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎵 Cosmic Chant
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('affirmation')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all text-center ${
                      customType === 'affirmation'
                        ? 'bg-sky-400/20 border-sky-400 text-sky-200 font-bold'
                        : 'bg-black/20 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🌟 Affirmation
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('sacred_voices')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border cursor-pointer transition-all text-center ${
                      customType === 'sacred_voices'
                        ? 'bg-purple-400/20 border-purple-400 text-purple-200 font-bold'
                        : 'bg-black/20 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎙️ Sacred Voice
                  </button>
                </div>

                {/* Title */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Title / Name:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={
                      customType === 'chant'
                        ? 'e.g. Door of My Heart'
                        : customType === 'sacred_voices'
                        ? 'e.g. Paramahansa Yogananda Divine Talk'
                        : 'e.g. Scientific Healing Affirmation'
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    YouTube URL or MP3 Link: <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    required
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://youtu.be/... or https://youtube.com/watch?v=..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-amber-400"
                  />
                  {customUrl.trim() && (
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={handleAutoCorrectUrl}
                        disabled={isResolvingUrl}
                        className="px-2 py-0.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>{isResolvingUrl ? 'Resolving...' : '✨ Auto-Correct Link & Fetch Title'}</span>
                      </button>

                      <a
                        href={cleanAndCanonicalizeYouTubeUrl(customUrl.trim())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-slate-400 hover:text-white underline"
                      >
                        Test / Open Link
                      </a>
                    </div>
                  )}
                </div>

                {/* Optional Affirmation or Sacred Words Text */}
                {(customType === 'affirmation' || customType === 'sacred_voices') && (
                  <div>
                    <label className="text-[11px] font-semibold text-amber-200 block mb-1">
                      Sacred Words / Affirmation Text (Optional — Displayed on screen):
                    </label>
                    <textarea
                      rows={2}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder={
                        customType === 'sacred_voices'
                          ? '“I will be Thine always, Lord. Through life and death, my soul is anchored in Thee...”'
                          : '“I am submerged in Thy eternal light; it permeates every particle of my being...”'
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-100 outline-none focus:border-amber-400 font-serif italic"
                    />
                  </div>
                )}

                {/* Play till music is over checkbox */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-200">
                    <input
                      type="checkbox"
                      checked={customPlayUntilFinished}
                      onChange={(e) => setCustomPlayUntilFinished(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-white/30 bg-black/50 cursor-pointer"
                    />
                    <span>Play till music is over (Auto-advance on track completion)</span>
                  </label>

                  {/* Fallback duration if user wants fixed timer */}
                  <div className="flex items-center justify-between text-xs text-slate-300 pl-6">
                    <span>Default duration if timer mode used:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomMinutes(Math.max(1, customMinutes - 1))}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold"
                      >
                        −
                      </button>
                      <span className="font-bold text-amber-300">{customMinutes} min</span>
                      <button
                        type="button"
                        onClick={() => setCustomMinutes(customMinutes + 1)}
                        className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all disabled:opacity-50 cursor-pointer shadow-md mt-2"
                >
                  + Add to Routine Sequence
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ROUTINE SEQUENCE DRAG & DROP REORDERING */}
          {activeTab === 'sequence' && (
            <div className="space-y-3">
              <div className="bg-black/30 p-3 rounded-2xl border border-white/10 text-xs text-slate-300 flex items-center justify-between">
                <span>
                  <strong>Drag & Drop</strong> any stage to reorder the sequence, or use the <strong>↑ ↓</strong> arrows.
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                  {sequenceOrder.length} Stages
                </span>
              </div>

              <div className="space-y-1.5">
                {sequenceOrder.map((stageId, idx) => {
                  const stage = stages[stageId];
                  if (!stage) return null;
                  const isCustom = stage.isCustomAdded;
                  const isPlayUntil = stage.playUntilFinished || stage.customMedia?.playUntilFinished;

                  return (
                    <div
                      key={`${stageId}_${idx}`}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                        dragOverIdx === idx
                          ? 'border-amber-400 bg-amber-400/20 shadow-lg scale-[1.01]'
                          : 'bg-black/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {/* Drag Handle & Order */}
                      <div className="flex items-center gap-2">
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-white p-1"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <span className="w-5 h-5 rounded-full bg-white/10 text-[10px] font-mono flex items-center justify-center font-bold text-slate-300">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-amber-200">
                              {stage.title}
                            </span>
                            {isCustom && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                                Added
                              </span>
                            )}
                            {stage.customMedia?.enabled && (
                              <span className="text-[9px] text-red-400 flex items-center gap-0.5">
                                <Youtube className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[200px] sm:max-w-xs">
                            {isPlayUntil ? '🎵 Plays until music ends' : `${stage.minutes} mins`}
                          </span>
                        </div>
                      </div>

                      {/* Controls: Reorder buttons, Duration stepper, Delete if custom */}
                      <div className="flex items-center gap-1">
                        {/* Up / Down arrows for mobile touch support */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, idx - 1)}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sequenceOrder.length - 1}
                          onClick={() => moveItem(idx, idx + 1)}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Duration increase / decrease */}
                        <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px]">
                          <button
                            type="button"
                            onClick={() => onUpdateStageConfig(stageId, { minutes: Math.max(1, stage.minutes - 1) })}
                            className="text-slate-400 hover:text-white px-1 font-bold cursor-pointer"
                            title="Decrease duration"
                          >
                            −
                          </button>
                          <span className="font-mono text-amber-300 w-5 text-center">{stage.minutes}m</span>
                          <button
                            type="button"
                            onClick={() => onUpdateStageConfig(stageId, { minutes: stage.minutes + 1 })}
                            className="text-slate-400 hover:text-white px-1 font-bold cursor-pointer"
                            title="Increase duration"
                          >
                            +
                          </button>
                        </div>

                        {/* Delete button if custom added */}
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => onRemoveStage(stageId)}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 ml-1 cursor-pointer"
                            title="Remove from sequence"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Sequence: {sequenceOrder.length} stages total</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
