import React, { useEffect, useMemo, useState } from 'react';
import { Station } from '../../types';
import { getAllStationNames, getStationHttpsIssues } from '../../services/stationAdminUtils';
import { useAdminAudioPreview } from '../../hooks/useAdminAudioPreview';

interface MergeDuplicatesModalProps {
  isOpen: boolean;
  stationsToMerge: Station[];
  initialBaseUuid: string;
  favorites: string[];
  onConfirmMerge: (payload: {
    baseUuid: string;
    deleteUuids: string[];
    mergedStation: Station;
  }) => void;
  onCancel: () => void;
  onPreviewImage: (url: string, title: string) => void;
}

const MergeDuplicatesModal: React.FC<MergeDuplicatesModalProps> = ({
  isOpen,
  stationsToMerge,
  initialBaseUuid,
  favorites,
  onConfirmMerge,
  onCancel,
  onPreviewImage,
}) => {
  const [baseUuid, setBaseUuid] = useState<string>(initialBaseUuid);
  const [selectedName, setSelectedName] = useState<string>('');
  const [selectedFavicon, setSelectedFavicon] = useState<string>('');
  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string>('');
  const [selectedAliases, setSelectedAliases] = useState<string[]>([]);
  const [mergedTags, setMergedTags] = useState<string>('');

  const { playingKey, isLoading: isAudioLoading, error: audioError, togglePlay, stop } = useAdminAudioPreview();

  const uniqueNames = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const st of stationsToMerge) {
      for (const n of getAllStationNames(st)) {
        const low = n.toLowerCase();
        if (!seen.has(low)) {
          seen.add(low);
          out.push(n);
        }
      }
    }
    return out;
  }, [stationsToMerge]);

  const uniqueFavicons = useMemo(() => {
    const map = new Map<string, { url: string; fromNames: string[]; isHttp: boolean }>();
    for (const st of stationsToMerge) {
      const url = (st.favicon || '').trim();
      if (!url) continue;
      const existing = map.get(url);
      if (existing) {
        existing.fromNames.push(st.name);
      } else {
        map.set(url, {
          url,
          fromNames: [st.name],
          isHttp: url.toLowerCase().startsWith('http://'),
        });
      }
    }
    return Array.from(map.values());
  }, [stationsToMerge]);

  const uniqueStreams = useMemo(() => {
    const map = new Map<
      string,
      { url: string; codec: string; bitrate: number; fromNames: string[]; isHttp: boolean }
    >();
    for (const st of stationsToMerge) {
      const url = (st.url_resolved || '').trim();
      if (!url) continue;
      const existing = map.get(url);
      if (existing) {
        existing.fromNames.push(st.name);
        if ((st.bitrate || 0) > existing.bitrate) existing.bitrate = st.bitrate || 0;
      } else {
        map.set(url, {
          url,
          codec: st.codec || '?',
          bitrate: st.bitrate || 0,
          fromNames: [st.name],
          isHttp: url.toLowerCase().startsWith('http://'),
        });
      }
    }
    return Array.from(map.values());
  }, [stationsToMerge]);

  // Initialize sensible defaults whenever modal opens or station selection changes
  useEffect(() => {
    if (!isOpen || stationsToMerge.length < 2) return;
    const validBase = stationsToMerge.find(s => s.stationuuid === initialBaseUuid) || stationsToMerge[0];
    setBaseUuid(validBase.stationuuid);

    setSelectedName(validBase.name);

    // Prefer HTTPS favicon if available, else base's favicon
    const httpsIcon = stationsToMerge.find(
      s => s.favicon?.trim() && !s.favicon.trim().toLowerCase().startsWith('http://')
    )?.favicon?.trim();
    setSelectedFavicon(httpsIcon || (validBase.favicon || '').trim() || uniqueFavicons[0]?.url || '');

    // Prefer HTTPS stream if available, else base's stream
    const httpsStream = stationsToMerge.find(
      s => s.url_resolved?.trim() && !s.url_resolved.trim().toLowerCase().startsWith('http://')
    )?.url_resolved?.trim();
    setSelectedStreamUrl(httpsStream || (validBase.url_resolved || '').trim() || uniqueStreams[0]?.url || '');

    // Collect all unique aliases (excluding chosen primary name)
    const primaryLow = validBase.name.trim().toLowerCase();
    const aliasSeen = new Set<string>([primaryLow]);
    const collectedAliases: string[] = [];
    for (const st of stationsToMerge) {
      for (const n of getAllStationNames(st)) {
        const low = n.toLowerCase();
        if (!aliasSeen.has(low)) {
          aliasSeen.add(low);
          collectedAliases.push(n);
        }
      }
    }
    setSelectedAliases(collectedAliases);

    // Merge & deduplicate tags
    const tagSeen = new Set<string>();
    const collectedTags: string[] = [];
    for (const st of stationsToMerge) {
      for (const t of (st.tags || '').split(/[,،]/).map(x => x.trim()).filter(Boolean)) {
        const low = t.toLowerCase();
        if (!tagSeen.has(low)) {
          tagSeen.add(low);
          collectedTags.push(t);
        }
      }
    }
    setMergedTags(collectedTags.join(', '));
  }, [isOpen, stationsToMerge, initialBaseUuid, uniqueFavicons, uniqueStreams]);

  if (!isOpen || stationsToMerge.length < 2) return null;

  const baseStation = stationsToMerge.find(s => s.stationuuid === baseUuid) || stationsToMerge[0];
  const deleteStations = stationsToMerge.filter(s => s.stationuuid !== baseStation.stationuuid);

  const handleSelectPrimaryName = (name: string) => {
    const prevName = selectedName.trim();
    setSelectedName(name);
    setSelectedAliases(prev => {
      const nextLow = name.trim().toLowerCase();
      const withoutNew = prev.filter(a => a.trim().toLowerCase() !== nextLow);
      if (
        prevName &&
        prevName.toLowerCase() !== nextLow &&
        !withoutNew.some(a => a.trim().toLowerCase() === prevName.toLowerCase())
      ) {
        return [prevName, ...withoutNew];
      }
      return withoutNew;
    });
  };

  const handleConfirm = () => {
    stop();
    const streamSource =
      stationsToMerge.find(s => s.url_resolved.trim() === selectedStreamUrl.trim()) || baseStation;
    const finalName = selectedName.trim() || baseStation.name;
    const finalAliases = selectedAliases
      .map(a => a.trim())
      .filter(a => a && a.toLowerCase() !== finalName.toLowerCase());

    const { aliases: _drop, ...restBase } = baseStation;
    const mergedStation: Station = {
      ...restBase,
      name: finalName,
      url_resolved: selectedStreamUrl.trim() || baseStation.url_resolved,
      favicon: selectedFavicon.trim(),
      tags: mergedTags.trim(),
      codec: streamSource.codec || baseStation.codec,
      bitrate: streamSource.bitrate || baseStation.bitrate,
      ...(finalAliases.length > 0 ? { aliases: finalAliases } : {}),
    };

    onConfirmMerge({
      baseUuid: baseStation.stationuuid,
      deleteUuids: deleteStations.map(s => s.stationuuid),
      mergedStation,
    });
  };

  const handleClose = () => {
    stop();
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-3 sm:p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="bg-bg-secondary border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-700/80 pb-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary">
              🔀 מיזוג תחנות ובחירת פרטים ({stationsToMerge.length} תחנות)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              בחר איזו תחנה תישאר כבסיס (ואילו יימחקו), ואיזה שם, תמונה וקישור שידור יישמרו בה.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-primary"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Choose Base Station (KEPT) vs Deleted */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-accent">
            1. איזו תחנה תישאר כמקור (מזהה UUID ושיוך למועדפים) ואילו יימחקו?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stationsToMerge.map(st => {
              const isBase = st.stationuuid === baseStation.stationuuid;
              const isFav = favorites.includes(st.stationuuid);
              const issues = getStationHttpsIssues(st);

              return (
                <button
                  key={st.stationuuid}
                  type="button"
                  onClick={() => setBaseUuid(st.stationuuid)}
                  className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 ${
                    isBase
                      ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/40'
                      : 'bg-bg-primary/60 border-gray-700/80 hover:border-gray-500'
                  }`}
                >
                  <img
                    src={st.favicon}
                    alt={st.name}
                    className="w-10 h-10 rounded bg-black object-contain border border-gray-700 flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).src = ''; }}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm text-text-primary truncate">{st.name}</span>
                      {isFav && <span className="text-xs">⭐ במועדפים</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      {isBase ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                          ✓ תישאר כמקור
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                          ✕ תימחק לאחר המיזוג
                        </span>
                      )}
                      <span className={issues.streamIsHttp ? 'text-amber-300' : 'text-emerald-300'}>
                        {issues.streamIsHttp ? 'HTTP' : 'HTTPS'}
                      </span>
                      <span className="text-text-secondary">{st.codec} • {st.bitrate || 0}k</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Primary Name */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-xs font-bold text-text-primary">2. איזה שם ראשי יוצג למשתמשים?</label>
            <span className="text-[11px] text-sky-300/90">שאר השמות יישמרו אוטומטית בכינויים</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueNames.map(name => {
              const active = selectedName.trim().toLowerCase() === name.toLowerCase();
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleSelectPrimaryName(name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-accent text-white border-accent shadow'
                      : 'bg-bg-primary text-text-primary border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {active ? '✓ ' : ''}{name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Logo / Favicon */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-text-primary">3. איזו תמונה (לוגו) לשמור?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {uniqueFavicons.map(item => {
              const active = selectedFavicon.trim() === item.url;
              return (
                <div
                  key={item.url}
                  onClick={() => setSelectedFavicon(item.url)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    active
                      ? 'bg-accent/15 border-accent ring-1 ring-accent/40'
                      : 'bg-bg-primary/60 border-gray-700/80 hover:border-gray-500'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewImage(item.url, item.fromNames.join(' / '));
                    }}
                    className="w-12 h-12 rounded-lg bg-black border border-gray-700 hover:border-accent flex-shrink-0 overflow-hidden cursor-zoom-in"
                    title="לחץ להגדלת התמונה בחלון בועה"
                  >
                    <img
                      src={item.url}
                      alt={item.fromNames[0]}
                      className="w-full h-full object-contain"
                      onError={e => { (e.target as HTMLImageElement).src = ''; }}
                    />
                  </button>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`font-bold ${active ? 'text-accent' : 'text-text-primary'}`}>
                        {active ? '✓ תמונה נבחרת' : 'בחר תמונה זו'}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.isHttp ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {item.isHttp ? 'HTTP' : 'HTTPS'}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-secondary truncate">מאת: {item.fromNames.join(', ')}</div>
                    <div className="text-[10px] font-mono text-text-secondary/80 truncate" dir="ltr">
                      {item.url}
                    </div>
                  </div>
                </div>
              );
            })}
            {uniqueFavicons.length === 0 && (
              <div className="text-xs text-text-secondary">לא קיים קישור תמונה בתחנות שנבחרו.</div>
            )}
          </div>
        </div>

        {/* Step 4: Stream URL */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-text-primary">4. איזה קישור שידור (Stream) לשמור?</label>
            {playingKey && (
              <button
                type="button"
                onClick={stop}
                className="px-2.5 py-1 rounded text-xs bg-red-600 text-white font-semibold"
              >
                ⏹ עצור השמעה
              </button>
            )}
          </div>

          {audioError && (
            <div className="p-2 rounded bg-red-500/15 border border-red-500/30 text-xs text-red-300">
              ❌ {audioError}
            </div>
          )}

          <div className="space-y-1.5">
            {uniqueStreams.map((item, idx) => {
              const active = selectedStreamUrl.trim() === item.url;
              const playKey = `merge-stream:${idx}`;
              const isPlaying = playingKey === playKey;

              return (
                <div
                  key={item.url}
                  onClick={() => setSelectedStreamUrl(item.url)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center gap-2 ${
                    active
                      ? 'bg-accent/15 border-accent ring-1 ring-accent/40'
                      : 'bg-bg-primary/60 border-gray-700/80 hover:border-gray-500'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`font-bold ${active ? 'text-accent' : 'text-text-primary'}`}>
                        {active ? '✓ קישור נבחר' : 'בחר קישור זה'}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          item.isHttp ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {item.isHttp ? 'HTTP' : 'HTTPS'}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {item.codec} • {item.bitrate}k • מאת: {item.fromNames.join(', ')}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-text-secondary break-all text-left" dir="ltr">
                      {item.url}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay(playKey, item.url, item.fromNames[0]);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex-shrink-0 ${
                      isPlaying
                        ? 'bg-red-600 text-white'
                        : 'bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-200 border border-emerald-500/40'
                    }`}
                  >
                    {isPlaying ? (isAudioLoading ? '⏳ טוען...' : '⏹ עצור') : '▶ האזן'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 5: Aliases & Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-bg-primary/60 border border-gray-700/80 space-y-2">
            <label className="block text-xs font-bold text-text-primary">
              5. שמות נוספים שיישמרו ({selectedAliases.length})
            </label>
            {selectedAliases.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedAliases.map(alias => (
                  <span
                    key={alias}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-500/15 text-sky-200 border border-sky-500/30"
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAliases(prev => prev.filter(a => a !== alias))}
                      className="text-sky-300 hover:text-red-300 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-text-secondary">אין שמות נוספים</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-bg-primary/60 border border-gray-700/80 space-y-2">
            <label className="block text-xs font-bold text-text-primary">6. תגיות מאוחדות</label>
            <input
              type="text"
              value={mergedTags}
              onChange={e => setMergedTags(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs text-text-primary focus:outline-none focus:border-accent"
              placeholder="תגיות מופרדות בפסיק..."
            />
          </div>
        </div>

        {/* Clear Final Action Summary */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
          <div className="text-emerald-300 font-semibold">
            ✓ יישמר ויעודכן: &quot;{selectedName || baseStation.name}&quot; (במזהה של {baseStation.name})
          </div>
          <div className="text-red-300">
            ✕ יימחקו לאחר העברת השמות והפרטים: {deleteStations.map(d => `"${d.name}"`).join(', ')}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium text-white transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-sm font-bold text-white transition-colors shadow-lg"
          >
            🔀 בצע מיזוג (שמור 1 ומחק {deleteStations.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeDuplicatesModal;
