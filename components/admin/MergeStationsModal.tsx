import React, { useEffect, useMemo, useState } from 'react';
import { Station } from '../../types';
import { getStationHttpsIssues } from '../../services/stationAdminUtils';
import { useAdminAudioPreview } from '../../hooks/useAdminAudioPreview';
import StationLogoThumb from './StationLogoThumb';

interface MergeStationsModalProps {
  stations: Station[] | null;
  favorites: string[];
  onConfirmMerge: (mergedStation: Station, deletedUuids: string[]) => void;
  onCancel: () => void;
}

const MergeStationsModal: React.FC<MergeStationsModalProps> = ({
  stations,
  favorites,
  onConfirmMerge,
  onCancel,
}) => {
  const [includedUuids, setIncludedUuids] = useState<string[]>([]);
  const [baseUuid, setBaseUuid] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [selectedFavicon, setSelectedFavicon] = useState('');
  const [selectedStreamUrl, setSelectedStreamUrl] = useState('');
  const [keptAliases, setKeptAliases] = useState<string[]>([]);
  const [imgStatusByUuid, setImgStatusByUuid] = useState<Record<string, 'empty' | 'loading' | 'ok' | 'error'>>({});

  const { playingKey, isLoading: isAudioLoading, error: audioError, togglePlay, stop } = useAdminAudioPreview();

  const sortedCandidates = useMemo(() => {
    if (!stations) return [];
    return [...stations].sort((a, b) => {
      const aFav = favorites.includes(a.stationuuid) ? 1 : 0;
      const bFav = favorites.includes(b.stationuuid) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      const aHttps = getStationHttpsIssues(a).streamIsHttp ? 0 : 1;
      const bHttps = getStationHttpsIssues(b).streamIsHttp ? 0 : 1;
      if (aHttps !== bHttps) return bHttps - aHttps;

      const aHasLogo = a.favicon?.trim() ? 1 : 0;
      const bHasLogo = b.favicon?.trim() ? 1 : 0;
      if (aHasLogo !== bHasLogo) return bHasLogo - aHasLogo;

      return (b.bitrate || 0) - (a.bitrate || 0);
    });
  }, [stations, favorites]);

  useEffect(() => {
    if (!stations || stations.length < 2) return;
    const allIds = sortedCandidates.map(s => s.stationuuid);
    const defaultBase = sortedCandidates[0];
    setIncludedUuids(allIds);
    setBaseUuid(defaultBase.stationuuid);
    setSelectedName(defaultBase.name);
    setSelectedFavicon(defaultBase.favicon || sortedCandidates.find(s => s.favicon?.trim())?.favicon || '');
    setSelectedStreamUrl(defaultBase.url_resolved);
    setImgStatusByUuid({});
  }, [stations, sortedCandidates]);

  const activeStations = useMemo(
    () => sortedCandidates.filter(s => includedUuids.includes(s.stationuuid)),
    [sortedCandidates, includedUuids]
  );

  // Auto-prefer a working logo if the initially chosen one fails to load and a sibling loads ok
  useEffect(() => {
    if (activeStations.length === 0) return;
    const currentOwners = activeStations.filter(s => (s.favicon || '').trim() === selectedFavicon.trim());
    const currentBroken =
      !selectedFavicon.trim() ||
      (currentOwners.length > 0 && currentOwners.every(s => imgStatusByUuid[s.stationuuid] === 'error'));
    if (!currentBroken) return;
    const workingSibling = activeStations.find(s => imgStatusByUuid[s.stationuuid] === 'ok' && s.favicon?.trim());
    if (workingSibling) {
      setSelectedFavicon(workingSibling.favicon);
    }
  }, [imgStatusByUuid, activeStations, selectedFavicon]);

  // Recompute default aliases whenever selectedName or activeStations changes
  useEffect(() => {
    if (activeStations.length === 0) return;
    const mainLow = selectedName.trim().toLowerCase();
    const seen = new Set<string>();
    const collected: string[] = [];
    for (const s of activeStations) {
      for (const candidate of [s.name, ...(s.aliases || [])]) {
        const trimmed = (candidate || '').trim();
        if (!trimmed) continue;
        const low = trimmed.toLowerCase();
        if (low === mainLow || seen.has(low)) continue;
        seen.add(low);
        collected.push(trimmed);
      }
    }
    setKeptAliases(collected);
  }, [selectedName, activeStations]);

  useEffect(() => {
    if (!stations) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [stations, onCancel, stop]);

  if (!stations || stations.length < 2) return null;

  const baseStation = activeStations.find(s => s.stationuuid === baseUuid) || activeStations[0];
  const deletedStations = activeStations.filter(s => s.stationuuid !== baseStation?.stationuuid);

  const uniqueNames = Array.from(
    new Map(
      activeStations
        .map(s => [s.name.trim().toLowerCase(), s] as const)
    ).values()
  );

  const uniqueFavicons = Array.from(
    new Map(
      activeStations
        .filter(s => (s.favicon || '').trim())
        .map(s => [s.favicon.trim(), s] as const)
    ).values()
  );

  const uniqueStreams = Array.from(
    new Map(
      activeStations
        .filter(s => (s.url_resolved || '').trim())
        .map(s => [s.url_resolved.trim(), s] as const)
    ).values()
  );

  const mergedTags = Array.from(
    new Set(
      activeStations
        .flatMap(s => (s.tags || '').split(/[,،]/))
        .map(t => t.trim())
        .filter(Boolean)
    )
  ).join(', ');

  const bestStreamSource =
    activeStations.find(s => s.url_resolved.trim() === selectedStreamUrl.trim()) || baseStation;

  const toggleIncludeStation = (uuid: string) => {
    setIncludedUuids(prev => {
      if (prev.includes(uuid)) {
        if (prev.length <= 2) return prev; // Need at least 2 stations to merge
        const next = prev.filter(id => id !== uuid);
        if (baseUuid === uuid && next.length > 0) {
          setBaseUuid(next[0]);
        }
        return next;
      }
      return [...prev, uuid];
    });
  };

  const handleConfirm = () => {
    if (!baseStation || deletedStations.length === 0) return;
    stop();

    const { aliases: _drop, ...baseRest } = baseStation;
    const merged: Station = {
      ...baseRest,
      name: selectedName.trim() || baseStation.name,
      favicon: selectedFavicon.trim(),
      url_resolved: selectedStreamUrl.trim() || baseStation.url_resolved,
      tags: mergedTags || baseStation.tags,
      codec: bestStreamSource?.codec || baseStation.codec,
      bitrate: bestStreamSource?.bitrate || baseStation.bitrate,
      ...(keptAliases.length > 0 ? { aliases: keptAliases } : {}),
    };

    onConfirmMerge(
      merged,
      deletedStations.map(s => s.stationuuid)
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[75] flex items-center justify-center p-3 sm:p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-label="מיזוג תחנות כפולות"
      onClick={() => {
        stop();
        onCancel();
      }}
    >
      <div
        className="bg-bg-secondary border border-gray-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/80 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">🔀 מיזוג תחנות כפולות</h3>
            <p className="text-[11px] text-text-secondary">
              בחר מה יישמר בתחנה המאוחדת. הכפילות תוסר ושמותיה יישמרו ככינויים לזיהוי עתידי.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stop();
              onCancel();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-primary"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Optional multi-select when 3+ stations in group */}
          {sortedCandidates.length > 2 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-text-secondary">תחנות המשתתפות במיזוג:</div>
              <div className="flex flex-wrap gap-1.5">
                {sortedCandidates.map(s => {
                  const checked = includedUuids.includes(s.stationuuid);
                  return (
                    <button
                      key={s.stationuuid}
                      type="button"
                      onClick={() => toggleIncludeStation(s.stationuuid)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                        checked
                          ? 'bg-accent/20 border-accent text-text-primary font-semibold'
                          : 'bg-bg-primary border-gray-700 text-text-secondary hover:border-gray-500'
                      }`}
                    >
                      {checked ? '✓ ' : '+ '}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 1. Primary Name Selection */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-text-secondary">1. איזה שם ראשי לשמור?</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uniqueNames.map(s => {
                const isPicked = selectedName.trim().toLowerCase() === s.name.trim().toLowerCase();
                return (
                  <button
                    key={s.stationuuid}
                    type="button"
                    onClick={() => setSelectedName(s.name)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between gap-2 ${
                      isPicked
                        ? 'bg-emerald-500/15 border-emerald-500 text-text-primary shadow-sm'
                        : 'bg-bg-primary/60 border-gray-700/80 text-text-secondary hover:border-gray-500'
                    }`}
                  >
                    <span className="font-bold text-sm truncate">{s.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold ${
                        isPicked
                          ? 'bg-emerald-500/25 text-emerald-300'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {isPicked ? '✓ יישמר כראשי' : 'יישמר ככינוי'}
                    </span>
                  </button>
                );
              })}
            </div>
            {keptAliases.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-text-secondary">שמות שיישמרו ככינויים:</span>
                {keptAliases.map(alias => (
                  <span
                    key={alias}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-sky-500/15 text-sky-200 border border-sky-500/30"
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => setKeptAliases(prev => prev.filter(a => a !== alias))}
                      className="text-sky-300 hover:text-red-300 font-bold"
                      title="אל תשמור שם זה ככינוי"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. Logo Selection */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-text-secondary">2. איזו תמונה (לוגו) לשמור?</div>
            {uniqueFavicons.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-bg-primary/50 border border-gray-800 text-xs text-text-secondary">
                לא הוגדר לוגו באף אחת מהתחנות.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uniqueFavicons.map(s => {
                  const isPicked = selectedFavicon.trim() === s.favicon.trim();
                  const imgStatus = imgStatusByUuid[s.stationuuid];
                  return (
                    <button
                      key={s.stationuuid}
                      type="button"
                      onClick={() => setSelectedFavicon(s.favicon)}
                      className={`p-2 rounded-xl border text-right transition-all flex items-center gap-2.5 ${
                        isPicked
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-bg-primary/60 border-gray-700/80 hover:border-gray-500'
                      }`}
                    >
                      <StationLogoThumb
                        src={s.favicon}
                        alt={s.name}
                        sizeClass="w-12 h-12 border border-gray-700"
                        onStatusChange={(st) =>
                          setImgStatusByUuid(prev =>
                            prev[s.stationuuid] === st ? prev : { ...prev, [s.stationuuid]: st }
                          )
                        }
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="text-xs font-semibold text-text-primary truncate">{s.name}</div>
                        {imgStatus === 'error' ? (
                          <div className="text-[10px] text-red-400">⚠️ תמונה שבורה / לא נטענת</div>
                        ) : imgStatus === 'ok' ? (
                          <div className="text-[10px] text-emerald-300">✓ תמונה תקינה</div>
                        ) : (
                          <div className="text-[10px] text-text-secondary">טוען תצוגה...</div>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold ${
                          isPicked ? 'bg-emerald-500/25 text-emerald-300' : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {isPicked ? '✓ נבחרה' : 'בחר'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Stream URL Selection (compact if identical) */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-text-secondary">3. קישור לשידור</div>
            {uniqueStreams.length <= 1 ? (
              <div className="p-2.5 rounded-xl bg-bg-primary/50 border border-gray-800 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-emerald-300 font-medium mb-0.5">
                    ✓ קישור השידור זהה בכל התחנות ({uniqueStreams[0]?.url_resolved.toLowerCase().startsWith('https://') ? 'HTTPS' : 'HTTP'})
                  </div>
                  <div className="text-[11px] font-mono text-text-secondary truncate text-left" dir="ltr">
                    {selectedStreamUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => togglePlay('merge-single', selectedStreamUrl, selectedName)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 ${
                    playingKey === 'merge-single'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300'
                  }`}
                >
                  {playingKey === 'merge-single' ? (isAudioLoading ? '⏳ עצור' : '⏹ עצור') : '▶ האזן'}
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {uniqueStreams.map(s => {
                  const isPicked = selectedStreamUrl.trim() === s.url_resolved.trim();
                  const isHttp = getStationHttpsIssues(s).streamIsHttp;
                  const playId = `merge-src:${s.stationuuid}`;
                  return (
                    <div
                      key={s.stationuuid}
                      onClick={() => setSelectedStreamUrl(s.url_resolved)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isPicked
                          ? 'bg-emerald-500/15 border-emerald-500'
                          : 'bg-bg-primary/60 border-gray-700/80 hover:border-gray-500'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-bold text-text-primary">{s.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isHttp ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {isHttp ? 'HTTP' : 'HTTPS'}
                          </span>
                          <span className="text-[10px] text-text-secondary">{s.codec || '?'} • {s.bitrate || 0}k</span>
                        </div>
                        <div className="text-[11px] font-mono text-text-secondary break-all text-left" dir="ltr">
                          {s.url_resolved}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlay(playId, s.url_resolved, s.name);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            playingKey === playId
                              ? 'bg-red-600 text-white'
                              : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300'
                          }`}
                        >
                          {playingKey === playId ? '⏹' : '▶'}
                        </button>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isPicked ? 'bg-emerald-500/25 text-emerald-300' : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {isPicked ? '✓ ייבחר' : 'בחר'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {audioError && (
              <div className="text-xs text-red-300 bg-red-500/15 border border-red-500/30 rounded p-2">
                ❌ {audioError}
              </div>
            )}
          </div>

          {/* 4. Which record UUID stays (for Favorites / order) */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-text-secondary">4. על איזו רשומה לבצע את המיזוג? (משפיע על מועדפים)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeStations.map(s => {
                const isBase = s.stationuuid === baseStation?.stationuuid;
                const isFav = favorites.includes(s.stationuuid);
                return (
                  <button
                    key={s.stationuuid}
                    type="button"
                    onClick={() => setBaseUuid(s.stationuuid)}
                    className={`px-2.5 py-2 rounded-xl border text-right transition-all flex items-center justify-between gap-2 ${
                      isBase
                        ? 'bg-accent/15 border-accent text-text-primary'
                        : 'bg-bg-primary/50 border-gray-800 text-text-secondary hover:border-gray-600'
                    }`}
                  >
                    <div className="min-w-0 truncate text-xs font-medium">
                      {isFav && <span className="ml-1">⭐</span>}
                      {s.name}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold ${
                        isBase
                          ? 'bg-accent/25 text-accent'
                          : 'bg-red-500/15 text-red-300'
                      }`}
                    >
                      {isBase ? '✓ נשארת' : '✕ תימחק'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/80 bg-bg-primary/40 space-y-2.5 shrink-0">
          <div className="text-[11px] text-text-secondary text-center">
            יישמר: <strong className="text-text-primary">{selectedName}</strong> • תימחק:{' '}
            <strong className="text-red-300">{deletedStations.map(s => s.name).join(', ')}</strong>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                stop();
                onCancel();
              }}
              className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-medium text-white transition-colors"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-sm font-bold text-white transition-colors"
            >
              🔀 מזג ושמור תחנה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeStationsModal;
