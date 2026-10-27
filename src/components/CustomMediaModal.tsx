import React, { useState, useEffect, useMemo } from 'react';
import { MeditationStageConfig, StageId, CustomMediaConfig } from '../types/meditation';
import {
  STAGE_MEDIA_PRESETS,
  StageMediaPreset,
  DEVOTIONAL_ALBUMS,
  HARMONIES_CATEGORIES,
  ALL_SACRED_TRACKS,
  ALL_DEVOTIONAL_SONGS,
  ALL_AFFIRMATION_PRESETS,
  SACRED_VOICE_PRESETS,
  detectMediaType,
  getYouTubeEmbedUrl,
  extractYouTubeId,
  extractYouTubeStartTime,
  formatSecondsToTimestamp,
  cleanAndCanonicalizeYouTubeUrl,
  fetchYouTubeVideoMetadata,
} from '../utils/customMedia';
import {
  X,
  Youtube,
  Music,
  ExternalLink,
  Sparkles,
  Check,
  RotateCcw,
  VolumeX,
  Volume2,
  Play,
  Search,
  Disc,
} from 'lucide-react';

interface CustomMediaModalProps {
  isOpen: boolean;
  stage: MeditationStageConfig | null;
  stages: Record<StageId, MeditationStageConfig>;
  onClose: () => void;
  onSaveMedia: (stageId: StageId, mediaConfig: CustomMediaConfig | undefined) => void;
}

const DEFAULT_MEDIA_STAGES: StageId[] = [
  'opening_prayer',
  'chant',
  'affirmation',
  'sacred_voices',
  'closing_prayer',
  'world_prayer',
];

export const CustomMediaModal: React.FC<CustomMediaModalProps> = ({
  isOpen,
  stage,
  stages,
  onClose,
  onSaveMedia,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<StageId>('chant');
  const [urlInput, setUrlInput] = useState<string>('');
  const [titleInput, setTitleInput] = useState<string>('');
  const [affirmationTextInput, setAffirmationTextInput] = useState<string>('');
  const [presetCategory, setPresetCategory] = useState<'stage' | 'all_songs' | 'affirmations' | 'harmonies_mp3' | 'albums'>('stage');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [muteSoundscape, setMuteSoundscape] = useState<boolean>(true);
  const [playUntilFinished, setPlayUntilFinished] = useState<boolean>(true);
  const [previewActive, setPreviewActive] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);
  const [urlResolvedMessage, setUrlResolvedMessage] = useState<string | null>(null);

  // Sync state whenever modal opens or active stage changes
  useEffect(() => {
    if (stage) {
      setSelectedStageId(stage.id);
      loadStageMedia(stage);
    }
  }, [stage, isOpen]);

  const loadStageMedia = (targetStage: MeditationStageConfig) => {
    const media = targetStage.customMedia;
    const isChantOrAffirmationOrVoice =
      targetStage.stageType === 'chant' ||
      targetStage.stageType === 'affirmation' ||
      targetStage.stageType === 'sacred_voices' ||
      targetStage.id === 'chant' ||
      targetStage.id.startsWith('affirmation') ||
      targetStage.id.startsWith('sacred_voices');

    if (media && media.url) {
      setUrlInput(media.url);
      setTitleInput(media.title || '');
      setAffirmationTextInput(media.affirmationText || targetStage.techniqueGuide.affirmationText || '');
      setIsEnabled(media.enabled);
      setMuteSoundscape(media.muteSoundscape ?? true);
      setPlayUntilFinished(media.playUntilFinished ?? targetStage.playUntilFinished ?? isChantOrAffirmationOrVoice);
    } else {
      // If no media set yet, check if there's a curated preset to suggest as a placeholder
      const stageKey = targetStage.stageType || targetStage.id;
      const presets = (STAGE_MEDIA_PRESETS as any)[stageKey] || (STAGE_MEDIA_PRESETS as any)[targetStage.id];
      if (presets && presets.length > 0) {
        setUrlInput(presets[0].url);
        setTitleInput(presets[0].title);
        setAffirmationTextInput(presets[0].affirmationText || targetStage.techniqueGuide.affirmationText || '');
        setIsEnabled(false); // default disabled until user confirms
      } else {
        setUrlInput('');
        setTitleInput('');
        setAffirmationTextInput(targetStage.techniqueGuide.affirmationText || '');
        setIsEnabled(false);
      }
      setMuteSoundscape(true);
      setPlayUntilFinished(true);
    }
    setPreviewActive(false);
    setSaveSuccess(false);
  };

  const handleStageTabClick = (id: StageId) => {
    setSelectedStageId(id);
    const targetStage = stages[id];
    if (targetStage) {
      loadStageMedia(targetStage);
    }
  };

  const currentActiveStage = stages[selectedStageId] || stage || stages['chant'] || Object.values(stages)[0];
  const mediaType = detectMediaType(urlInput);
  const youtubeId = extractYouTubeId(urlInput);
  const embedUrl = getYouTubeEmbedUrl(urlInput, false);

  // Build selectable stages: default keys + any custom added chant/affirmation/sacred_voices stages
  const activeMediaStages = Array.from(
    new Set([
      ...DEFAULT_MEDIA_STAGES.filter((id) => Boolean(stages[id])),
      ...Object.keys(stages).filter(
        (id) =>
          stages[id]?.stageType === 'chant' ||
          stages[id]?.stageType === 'affirmation' ||
          stages[id]?.stageType === 'sacred_voices' ||
          stages[id]?.customMedia?.enabled ||
          Boolean(stages[id]?.techniqueGuide?.affirmationText)
      ),
    ])
  );

  // Resolve tracks to display based on category, album filter, and search query
  const displayedTracks = useMemo(() => {
    let pool: StageMediaPreset[] = [];
    if (presetCategory === 'stage') {
      const stageKey = currentActiveStage.stageType || selectedStageId;
      pool =
        (STAGE_MEDIA_PRESETS as any)[stageKey] ||
        (STAGE_MEDIA_PRESETS as any)[selectedStageId] ||
        STAGE_MEDIA_PRESETS.chant ||
        [];
    } else if (presetCategory === 'all_songs') {
      pool = ALL_DEVOTIONAL_SONGS;
    } else if (presetCategory === 'affirmations') {
      pool = ALL_AFFIRMATION_PRESETS;
    } else if (presetCategory === 'harmonies_mp3') {
      pool = ALL_SACRED_TRACKS.filter((t) => t.type === 'mp3');
    } else if (presetCategory === 'albums') {
      pool = ALL_SACRED_TRACKS;
    }

    if (selectedAlbumId !== 'all') {
      pool = pool.filter(
        (t) =>
          t.albumId === selectedAlbumId ||
          t.album === selectedAlbumId ||
          t.category === selectedAlbumId
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      pool = pool.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subtitle.toLowerCase().includes(q) ||
          (t.album && t.album.toLowerCase().includes(q)) ||
          (t.speaker && t.speaker.toLowerCase().includes(q)) ||
          (t.affirmationText && t.affirmationText.toLowerCase().includes(q))
      );
    }

    return pool;
  }, [presetCategory, selectedAlbumId, searchQuery, currentActiveStage, selectedStageId]);

  const handleApplyPreset = (preset: StageMediaPreset) => {
    setUrlInput(preset.url);
    setTitleInput(preset.title);
    if (preset.affirmationText) {
      setAffirmationTextInput(preset.affirmationText);
    }
    setIsEnabled(true);
    setPreviewActive(true);
  };

  const handleAutoCorrectAndFetchTitle = async () => {
    if (!urlInput.trim()) return;
    setIsResolvingUrl(true);
    try {
      const canonical = cleanAndCanonicalizeYouTubeUrl(urlInput.trim());
      setUrlInput(canonical);
      const meta = await fetchYouTubeVideoMetadata(canonical);
      if (meta.title) {
        setTitleInput(meta.title);
        setUrlResolvedMessage(`Corrected link & fetched title: "${meta.title}"`);
      } else {
        setUrlResolvedMessage('Link cleaned and converted to canonical YouTube format!');
      }
    } catch {
      setUrlResolvedMessage('Link formatted to canonical YouTube URL.');
    } finally {
      setIsResolvingUrl(false);
      setTimeout(() => setUrlResolvedMessage(null), 3000);
    }
  };

  const handleSave = () => {
    if (!urlInput.trim()) {
      // Clear media
      onSaveMedia(selectedStageId, undefined);
    } else {
      const type = detectMediaType(urlInput);
      const sanitizedUrl = type === 'youtube' ? cleanAndCanonicalizeYouTubeUrl(urlInput.trim()) : urlInput.trim();
      const config: CustomMediaConfig = {
        enabled: isEnabled,
        url: sanitizedUrl,
        title: titleInput.trim() || (type === 'youtube' ? 'YouTube Chant/Prayer' : 'Custom Audio'),
        affirmationText: affirmationTextInput.trim() || undefined,
        type: type === 'youtube' ? 'youtube' : 'mp3',
        muteSoundscape,
        playUntilFinished,
      };
      onSaveMedia(selectedStageId, config);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleClear = () => {
    setUrlInput('');
    setTitleInput('');
    setAffirmationTextInput('');
    setIsEnabled(false);
    onSaveMedia(selectedStageId, undefined);
    setPreviewActive(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-media-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-xl bg-[#0c1533] text-slate-100 border border-amber-400/50 rounded-[28px] shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-700/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                <Youtube className="w-4 h-4" />
              </span>
              <h2
                id="custom-media-modal-title"
                className="text-xl sm:text-2xl font-bold text-amber-300 font-spiritual"
              >
                Custom Audio & YouTube Links
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Customize YouTube chants, prayers, or MP3 links to play during meditation stages.
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

        {/* Stage Selection Tabs */}
        <div className="mt-4">
          <label className="text-[11px] uppercase tracking-wider font-bold text-amber-300 block mb-1.5">
            Select Stage to Customize:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
            {activeMediaStages.map((id) => {
              const stg = stages[id] || { title: id, customMedia: undefined };
              const isSelected = selectedStageId === id;
              const hasConfigured = Boolean(stg?.customMedia?.enabled && stg?.customMedia?.url);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleStageTabClick(id)}
                  className={`px-2 py-1.5 rounded-xl text-xs font-semibold flex flex-col items-center justify-center text-center transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-bold'
                      : 'bg-slate-800/80 text-slate-200 border-slate-700/70 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate w-full">{stg?.title || id}</span>
                  {hasConfigured ? (
                    <span
                      className={`text-[8.5px] px-1.5 py-0.2 rounded-full mt-0.5 font-bold ${
                        isSelected ? 'bg-slate-950 text-amber-300' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      ● Active Link
                    </span>
                  ) : (
                    <span className="text-[8px] opacity-60">Customizable</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Stage Config Arena */}
        <div className="mt-4 p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 space-y-4">
          {/* Enable / Disable Switch */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-sm font-bold text-amber-200 block">
                {currentActiveStage.title} Media
              </span>
              <span className="text-xs text-slate-400">
                Play this YouTube video or audio file when {currentActiveStage.title} begins
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEnabled(!isEnabled)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                isEnabled
                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {isEnabled ? '✓ Media Enabled' : '○ Media Disabled'}
            </button>
          </div>

          {/* URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="media-url-input"
                className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"
              >
                <span>YouTube or MP3 Link:</span>
              </label>
              {mediaType === 'youtube' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-red-400 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Youtube className="w-3 h-3" /> YouTube Video Detected
                  </span>
                  {extractYouTubeStartTime(urlInput) !== null && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      ⏱ Starts at {formatSecondsToTimestamp(extractYouTubeStartTime(urlInput)!)}
                    </span>
                  )}
                </div>
              )}
              {mediaType === 'mp3' && (
                <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 border border-sky-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Music className="w-3 h-3" /> Direct Audio / MP3 Detected
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="media-url-input"
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setIsEnabled(true);
                }}
                placeholder="https://www.youtube.com/watch?v=... or https://example.com/audio.mp3"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono outline-none"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports standard YouTube links (<code className="text-amber-300">youtube.com/watch?v=...</code>,{' '}
              <code className="text-amber-300">youtu.be/...</code>), Shorts, and direct MP3 audio URLs.
            </p>

            {/* Auto-Correct & Title Fetch Action */}
            {urlInput.trim() && (
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleAutoCorrectAndFetchTitle}
                  disabled={isResolvingUrl}
                  className="px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Clean URL parameters and fetch exact video title"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isResolvingUrl ? 'Resolving Title...' : '✨ Auto-Correct Link & Fetch Title'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewActive(!previewActive)}
                    className="text-xs text-sky-300 hover:text-white underline cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>{previewActive ? 'Hide Player' : 'Test / Preview Video'}</span>
                  </button>

                  <a
                    href={cleanAndCanonicalizeYouTubeUrl(urlInput.trim())}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-amber-300 flex items-center gap-1 underline"
                    title="Open directly on YouTube"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in YouTube</span>
                  </a>
                </div>
              </div>
            )}

            {urlResolvedMessage && (
              <div className="mt-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 py-1 px-2.5 rounded-lg animate-in fade-in">
                ✓ {urlResolvedMessage}
              </div>
            )}
          </div>

          {/* Title / Label Input */}
          <div>
            <label htmlFor="media-title-input" className="text-xs font-semibold text-slate-200 block mb-1">
              Custom Title / Description (Optional):
            </label>
            <input
              id="media-title-input"
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="e.g. Door of My Heart — Paramahansa Yogananda"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-xs text-slate-100 placeholder-slate-500 outline-none"
            />
          </div>

          {/* Affirmation / Sacred Words Text (Displayed during playback) */}
          <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="media-affirmation-text" className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Sacred Affirmation / Prayer / Words (Displayed on Screen):</span>
              </label>
              {affirmationTextInput.trim() && (
                <button
                  type="button"
                  onClick={() => setAffirmationTextInput('')}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear words
                </button>
              )}
            </div>
            <textarea
              id="media-affirmation-text"
              rows={3}
              value={affirmationTextInput}
              onChange={(e) => setAffirmationTextInput(e.target.value)}
              placeholder="Enter affirmation or sacred words to recite while listening (e.g. “I am submerged in Thy eternal light; it permeates every particle of my being.”)..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-xs text-amber-100 placeholder-slate-500 font-serif italic outline-none resize-none leading-relaxed"
            />
            <p className="text-[11px] text-amber-200/80">
              ✨ These words appear in a radiant card during meditation so you can recite and meditate upon them while the music or talk plays.
            </p>
          </div>

          {/* Ambient Soundscape Mute Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              {muteSoundscape ? (
                <VolumeX className="w-4 h-4 text-amber-300" />
              ) : (
                <Volume2 className="w-4 h-4 text-sky-300" />
              )}
              <div>
                <span className="font-semibold text-slate-200 block">
                  Mute Background Soundscape During Playback
                </span>
                <span className="text-[11px] text-slate-400">
                  {muteSoundscape
                    ? 'Only custom chant/prayer plays'
                    : 'Custom audio mixes with background ambient sounds'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMuteSoundscape(!muteSoundscape)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer ${
                muteSoundscape
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {muteSoundscape ? 'Muted' : 'Mixed'}
            </button>
          </div>

          {/* Play Until Music Is Over Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-300" />
              <div>
                <span className="font-semibold text-slate-200 block">
                  Play Until Music Is Over (Recommended)
                </span>
                <span className="text-[11px] text-slate-400">
                  {playUntilFinished
                    ? 'Track plays in full; auto-advances to next stage upon completion'
                    : 'Fixed countdown timer determines stage duration'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPlayUntilFinished(!playUntilFinished)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer ${
                playUntilFinished
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {playUntilFinished ? 'Music Driven' : 'Fixed Timer'}
            </button>
          </div>

          {/* Interactive Live Preview Box */}
          {urlInput.trim() && (
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-amber-300" /> Test & Preview Link
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewActive(!previewActive)}
                    className="text-[11px] underline text-sky-300 hover:text-white cursor-pointer"
                  >
                    {previewActive ? 'Hide Player' : 'Open Test Player'}
                  </button>
                  <a
                    href={urlInput}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-300 hover:text-white inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full"
                    title="Open link in browser tab"
                  >
                    <span>External Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {previewActive && (
                <div className="rounded-xl overflow-hidden bg-black border border-amber-400/30 p-2">
                  {mediaType === 'youtube' && embedUrl ? (
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={embedUrl}
                        title="YouTube Preview Player"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : mediaType === 'mp3' ? (
                    <div className="p-3 bg-slate-950 rounded-lg flex flex-col gap-2">
                      <span className="text-xs text-sky-300 font-mono truncate">{urlInput}</span>
                      <audio controls className="w-full h-10" src={urlInput}>
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-amber-200">
                      Please enter a valid YouTube or direct MP3 audio link to preview.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Curated Sacred Presets Library with Category Filter & Search */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Sacred Collections Library ({displayedTracks.length} tracks):</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {DEVOTIONAL_ALBUMS.length} Albums · 324 Total Tracks
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: 'stage', label: `For ${currentActiveStage.title}` },
                  { id: 'all_songs', label: `All Songs (${ALL_DEVOTIONAL_SONGS.length})` },
                  { id: 'affirmations', label: `Affirmations (${ALL_AFFIRMATION_PRESETS.length})` },
                  { id: 'harmonies_mp3', label: 'Harmonies MP3s (71)' },
                  { id: 'albums', label: 'All 21 Albums' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setPresetCategory(cat.id as any);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all cursor-pointer border ${
                      presetCategory === cat.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search & Album Selection Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs, chants, affirmations, lyrics..."
                    className="w-full pl-8 pr-7 py-1.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Album / Category Filter Dropdown */}
                <div className="relative">
                  <select
                    value={selectedAlbumId}
                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-amber-200 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="all">All Albums & Categories ({ALL_SACRED_TRACKS.length} tracks)</option>
                    <optgroup label="Devotional Albums (21)">
                      {DEVOTIONAL_ALBUMS.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.name} ({album.tracks.length} tracks)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Harmonies Audio Categories">
                      {HARMONIES_CATEGORIES.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            </div>

            {/* Track Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {displayedTracks.length === 0 ? (
                <div className="col-span-full py-6 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                  No tracks match "{searchQuery}". Try a different keyword or album filter.
                </div>
              ) : (
                displayedTracks.map((preset) => {
                  const isCurrent = urlInput === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isCurrent
                          ? 'bg-amber-400/20 border-amber-400/70 text-amber-200 shadow-sm'
                          : 'bg-slate-950/60 border-slate-800 hover:border-amber-400/50 text-slate-200 hover:bg-slate-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <span className="font-bold text-xs truncate leading-snug">{preset.title}</span>
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            {preset.type === 'youtube' ? (
                              <span className="p-0.5 rounded bg-red-950/80 border border-red-500/40 text-red-400" title="YouTube video">
                                <Youtube className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="p-0.5 rounded bg-sky-950/80 border border-sky-500/40 text-sky-400" title="High-Res MP3 Audio">
                                <Music className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {preset.album && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-amber-300/80 truncate max-w-[150px]">
                              {preset.album}
                            </span>
                          )}
                          {preset.speaker && (
                            <span className="text-[9.5px] text-slate-400 truncate">
                              · {preset.speaker}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 line-clamp-2 mt-1">
                          {preset.subtitle}
                        </span>
                        {preset.affirmationText && (
                          <span className="text-[10px] text-amber-300/90 font-serif italic line-clamp-2 mt-1 block">
                            “{preset.affirmationText.slice(0, 90)}...”
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-semibold pt-1 border-t border-white/5">
                        <span>{isCurrent ? '✓ Currently Loaded' : '+ Select this track'}</span>
                        {preset.isAffirmation ? (
                          <span className="text-[9px] text-sky-400">Affirmation / Wisdom</span>
                        ) : preset.affirmationText ? (
                          <span className="text-[9px] text-emerald-400">With Lyrics</span>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-slate-700/80 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-full transition-colors flex items-center gap-1.5"
            title="Clear custom media and revert to default soundscape"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Revert to Soundscape
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-full shadow-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-800" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save & Apply</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
