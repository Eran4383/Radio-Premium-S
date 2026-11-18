import React, { useMemo, useState } from 'react';
import { Station } from '../../types';
import { findPotentialDuplicates, getStationHttpsIssues } from '../../services/stationAdminUtils';
import { useAdminAudioPreview } from '../../hooks/useAdminAudioPreview';
import MergeDuplicatesModal from './MergeDuplicatesModal';

interface AdminDuplicatesTabProps {
  stations: Station[];
  favorites: string[];
  ignoredPairKeys: string[];
  onEdit: (station: Station) => void;
  onDelete: (uuid: string) => void;
  onMergeAndDelete: (sourceUuid: string, duplicateUuid: string) => void;
  onMergeStations: (payload: {
    baseUuid: string;
    deleteUuids: string[];
    mergedStation: Station;
  }) => void;
  onMarkNotDuplicates: (groupStations: Station[]) => void;
  onExcludeStationFromGroup: (station: Station, groupStations: Station[]) => void;
  onResetIgnoredPairs: () => void;
  onPreviewImage: (url: string, title: string, stationUuid: string) => void;
}

const AdminDuplicatesTab: React.FC<AdminDuplicatesTabProps> = ({
  stations,
  favorites,
  ignoredPairKeys,
  onEdit,
  onDelete,
  onMergeAndDelete,
  onMergeStations,
  onMarkNotDuplicates,
  onExcludeStationFromGroup,
  onResetIgnoredPairs,
  onPreviewImage,
}) => {
  const [selectedSourceByGroup, setSelectedSourceByGroup] = useState<Record<string, string>>({});
  const [selectedForMergeByGroup, setSelectedForMergeByGroup] = useState<Record<string, string[]>>({});
  const [sourceMergePickerId, setSourceMergePickerId] = useState<string | null>(null);
  const [mergeModalState, setMergeModalState] = useState<{
    isOpen: boolean;
    stationsToMerge: Station[];
    initialBaseUuid: string;
    groupId: string;
  }>({
    isOpen: false,
    stationsToMerge: [],
    initialBaseUuid: '',
    groupId: '',
  });

  const { playingKey, error: previewError, togglePlay, stop: stopPreview } = useAdminAudioPreview();

  const duplicateGroups = useMemo(() => {
    return findPotentialDuplicates(stations, ignoredPairKeys);
  }, [stations, ignoredPairKeys]);

  const getSuggestedSourceUuid = (groupStations: Station[]): string => {
    const sorted = [...groupStations].sort((a, b) => {
      const aFav = favorites.includes(a.stationuuid) ? 1 : 0;
      const bFav = favorites.includes(b.stationuuid) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;

      const aHttps = getStationHttpsIssues(a).streamIsHttp ? 0 : 1;
      const bHttps = getStationHttpsIssues(b).streamIsHttp ? 0 : 1;
      if (aHttps !== bHttps) return bHttps - aHttps;

      const aAliases = a.aliases?.length || 0;
      const bAliases = b.aliases?.length || 0;
      if (aAliases !== bAliases) return bAliases - aAliases;

      return (b.bitrate || 0) - (a.bitrate || 0);
    });
    return sorted[0]?.stationuuid || '';
  };

  const toggleStationMergeCheck = (groupId: string, uuid: string) => {
    setSelectedForMergeByGroup(prev => {
      const current = prev[groupId] || [];
      const exists = current.includes(uuid);
      const next = exists ? current.filter(id => id !== uuid) : [...current, uuid];
      return { ...prev, [groupId]: next };
    });
  };

  const openMergeModal = (groupId: string, subset: Station[], preferredBaseUuid: string) => {
    if (subset.length < 2) return;
    stopPreview();
    const validBase = subset.some(s => s.stationuuid === preferredBaseUuid)
      ? preferredBaseUuid
      : subset[0].stationuuid;
    setMergeModalState({
      isOpen: true,
      stationsToMerge: subset,
      initialBaseUuid: validBase,
      groupId,
    });
  };

  return (
    <div className="space-y-4">
      <MergeDuplicatesModal
        isOpen={mergeModalState.isOpen}
        stationsToMerge={mergeModalState.stationsToMerge}
        initialBaseUuid={mergeModalState.initialBaseUuid}
        favorites={favorites}
        onPreviewImage={(url, title) =>
          onPreviewImage(url, title, mergeModalState.initialBaseUuid)
        }
        onCancel={() => setMergeModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirmMerge={(payload) => {
          onMergeStations(payload);
          if (mergeModalState.groupId) {
            setSelectedForMergeByGroup(prev => {
              const next = { ...prev };
              delete next[mergeModalState.groupId];
              return next;
            });
          }
          setMergeModalState(prev => ({ ...prev, isOpen: false }));
        }}
      />

      <div className="bg-bg-secondary p-4 rounded-lg border border-blue-500/30 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-text-primary">🔍 איתור כפילויות בטוח (ללא מחיקה אוטומטית)</h3>
          <div className="flex flex-wrap items-center gap-2">
            {ignoredPairKeys.length > 0 && (
              <button
                type="button"
                onClick={onResetIgnoredPairs}
                className="px-2.5 py-1 text-[11px] rounded bg-gray-700/80 hover:bg-gray-600 text-gray-200 transition-colors"
                title="אפס את רשימת הזוגות שסומנו כלא-כפילות ובדוק מחדש"
              >
                🔄 אפס סימוני &quot;לא כפילות&quot; ({ignoredPairKeys.length})
              </button>
            )}
            {playingKey && (
              <button
                type="button"
                onClick={stopPreview}
                className="px-3 py-1 text-xs font-semibold rounded bg-red-600 hover:bg-red-500 text-white"
              >
                ⏹ עצור השמעת בדיקה
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          התחנה המסומנת כ<strong className="text-emerald-300">&quot;תחנת מקור (תישאר)&quot;</strong> היא זו שתישמר, ושאר הכפילויות יימחקו לאחר העברת השמות.
          לשליטה מלאה: תוכל לסמן חלק מהתחנות בקבוצה (למשל 2 מתוך 4) וללחוץ <strong>&quot;🔀 מזג תחנות נבחרות&quot;</strong> כדי לבחור שם, לוגו וקישור שידור ספציפי — או ללחוץ <strong>&quot;🙅 אינה כפילה (החרג)&quot;</strong> על מקור שרק נראה דומה אך הוא תחנה אחרת.
        </p>
        {previewError && (
          <div className="p-2 rounded bg-red-500/15 border border-red-500/30 text-xs text-red-300">
            {previewError}
          </div>
        )}
      </div>

      {duplicateGroups.length === 0 ? (
        <div className="bg-bg-secondary p-8 rounded-lg text-center text-text-secondary text-sm">
          ✅ לא נמצאו קבוצות חשודות לכפילות ברשימה הנוכחית.
        </div>
      ) : (
        <div className="space-y-4">
          {duplicateGroups.map(group => {
            const explicitSource = selectedSourceByGroup[group.id];
            const sourceExists = group.stations.some(s => s.stationuuid === explicitSource);
            const activeSourceUuid = sourceExists
              ? explicitSource
              : getSuggestedSourceUuid(group.stations);
            const activeSourceStation = group.stations.find(s => s.stationuuid === activeSourceUuid);

            const checkedIds = (selectedForMergeByGroup[group.id] || []).filter(id =>
              group.stations.some(s => s.stationuuid === id)
            );
            const checkedStations = group.stations.filter(s => checkedIds.includes(s.stationuuid));

            return (
              <div key={group.id} className="bg-bg-secondary rounded-lg border border-gray-700 p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700/70 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        group.confidence === 'high'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {group.confidence === 'high' ? 'כפילות ודאית' : 'חשד לכפילות'} • {group.reasonLabel}
                    </span>
                    <span className="text-xs text-text-secondary">({group.stations.length} תחנות)</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openMergeModal(group.id, group.stations, activeSourceUuid)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-accent/20 hover:bg-accent/35 text-accent border border-accent/40 transition-colors"
                      title="בחר איזו תמונה, שם וקישור לשמור ואיזו תחנה תישאר"
                    >
                      🔀 מזג ובחר פרטים...
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkNotDuplicates(group.stations)}
                      className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                      title="שמור שזוגות אלו אינם כפילות — הם לא יוצגו שוב יחד בעתיד, אך עדיין יזוהו מול תחנות אחרות"
                    >
                      ✓ כולן תחנות שונות (אל תזהה יחד)
                    </button>
                  </div>
                </div>

                {checkedStations.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/40 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-text-primary">
                      סומנו <strong>{checkedStations.length}</strong> מתוך {group.stations.length} תחנות למיזוג
                      {checkedStations.length < 2 && ' (סמן לפחות 2 תחנות)'}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {checkedStations.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => openMergeModal(group.id, checkedStations, activeSourceUuid)}
                          className="px-3 py-1 rounded text-xs font-bold bg-accent hover:bg-accent-hover text-white shadow transition-colors"
                        >
                          🔀 מזג נבחרות ({checkedStations.length}) ובחר מקור...
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedForMergeByGroup(prev => ({ ...prev, [group.id]: [] }))
                        }
                        className="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-200"
                      >
                        נקה סימון
                      </button>
                    </div>
                  </div>
                )}

                {group.warningText && (
                  <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded p-2">
                    ⚠️ {group.warningText}
                  </p>
                )}

                <div className="space-y-2">
                  {group.stations.map(s => {
                    const issues = getStationHttpsIssues(s);
                    const isPreviewing = playingKey === s.stationuuid;
                    const isFav = favorites.includes(s.stationuuid);
                    const isSource = s.stationuuid === activeSourceUuid;
                    const isChecked = checkedIds.includes(s.stationuuid);
                    const siblings = group.stations.filter(x => x.stationuuid !== s.stationuuid);
                    const pickerKey = `${group.id}:${s.stationuuid}`;
                    const showMultiMergePicker = sourceMergePickerId === pickerKey;

                    return (
                      <div
                        key={s.stationuuid}
                        className={`p-2.5 rounded-lg bg-bg-primary border flex flex-col gap-2.5 transition-colors ${
                          isSource
                            ? 'border-emerald-500/70 bg-emerald-500/5'
                            : isChecked
                            ? 'border-accent/70'
                            : 'border-gray-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-start gap-2.5 flex-grow min-w-0">
                            <label
                              className="flex items-center pt-2 cursor-pointer"
                              title="סמן תחנה זו למיזוג חלקי (למשל 2 מתוך 4)"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleStationMergeCheck(group.id, s.stationuuid)}
                                className="w-4 h-4 accent-accent rounded cursor-pointer"
                                aria-label={`בחר את ${s.name} למיזוג`}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                if (s.favicon?.trim()) onPreviewImage(s.favicon, s.name, s.stationuuid);
                              }}
                              disabled={!s.favicon?.trim()}
                              className="w-10 h-10 rounded bg-black object-contain flex-shrink-0 border border-gray-700 hover:border-accent overflow-hidden cursor-zoom-in disabled:cursor-default"
                              title={s.favicon?.trim() ? 'לחץ להגדלת הלוגו' : undefined}
                            >
                              <img
                                src={s.favicon}
                                alt={s.name}
                                className="w-full h-full object-contain"
                                onError={e => { (e.target as HTMLImageElement).src = ''; }}
                              />
                            </button>
                            <div className="min-w-0 flex-grow space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-sm text-text-primary">{s.name}</span>
                                {isSource ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 font-bold">
                                    ✓ תחנת מקור (תישאר)
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300/90 border border-amber-500/25">
                                    מועמדת למחיקה/איחוד
                                  </span>
                                )}
                                {isFav && <span className="text-xs" title="במועדפים שלך">⭐ במועדפים</span>}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                                  {s.codec || '?'} • {s.bitrate || 0}k
                                </span>
                                {issues.streamIsHttp ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">HTTP</span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">HTTPS</span>
                                )}
                              </div>
                              {s.aliases && s.aliases.length > 0 && (
                                <div className="text-[11px] text-sky-300/90">
                                  שמות נוספים: {s.aliases.join(' · ')}
                                </div>
                              )}
                              <div className="text-[11px] font-mono text-text-secondary break-all text-left" dir="ltr">
                                {s.url_resolved}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 justify-end">
                            <button
                              type="button"
                              onClick={() => togglePlay(s.stationuuid, s.url_resolved, s.name)}
                              className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                                isPreviewing
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300'
                              }`}
                            >
                              {isPreviewing ? '⏹ עצור' : '▶ האזן'}
                            </button>
                            {!isSource && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedSourceByGroup(prev => ({ ...prev, [group.id]: s.stationuuid }))
                                }
                                className="px-2.5 py-1.5 rounded text-xs bg-emerald-700/30 hover:bg-emerald-700/50 text-emerald-200 border border-emerald-500/30 transition-colors"
                                title="סמן תחנה זו כתחנת המקור שתישאר (לא תימחק)"
                              >
                                קבע כמקור (תישאר)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onExcludeStationFromGroup(s, group.stations)}
                              className="px-2.5 py-1.5 rounded text-xs bg-gray-700/70 hover:bg-gray-600 text-gray-200 transition-colors"
                              title="החרג תחנה זו מהקבוצה — המערכת תזכור שאינה כפילה של תחנות אלו, אך תמשיך לזהות את שאר התחנות בקבוצה"
                            >
                              🙅 אינה כפילה
                            </button>
                            <button
                              type="button"
                              onClick={() => onEdit(s)}
                              className="px-2.5 py-1.5 rounded text-xs text-blue-400 hover:bg-blue-400/20"
                            >
                              ערוך
                            </button>

                            {!isSource && activeSourceStation && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openMergeModal(
                                      group.id,
                                      [activeSourceStation, s],
                                      activeSourceStation.stationuuid
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded text-xs font-semibold bg-accent/20 hover:bg-accent/35 text-accent border border-accent/40 transition-colors"
                                  title={`מזג את "${s.name}" עם "${activeSourceStation.name}" ובחר איזו תמונה, שם וקישור לשמור`}
                                >
                                  🔀 מזג ובחר שדות
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isPreviewing) stopPreview();
                                    onMergeAndDelete(activeSourceStation.stationuuid, s.stationuuid);
                                  }}
                                  className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-600/25 hover:bg-amber-600/45 text-amber-200 border border-amber-500/40 transition-colors"
                                  title={`מחק את "${s.name}" והעבר את שמה לכינויים של "${activeSourceStation.name}" (שתישאר)`}
                                >
                                  🔗 מחק זו ושמור שמה ב&quot;{activeSourceStation.name}&quot;
                                </button>
                              </>
                            )}

                            {isSource && siblings.length === 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isPreviewing) stopPreview();
                                  onMergeAndDelete(siblings[0].stationuuid, s.stationuuid);
                                }}
                                className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-600/25 hover:bg-amber-600/45 text-amber-200 border border-amber-500/40 transition-colors"
                                title={`מחק את "${s.name}" והעבר את שמה אל "${siblings[0].name}" (שתישאר)`}
                              >
                                🔗 מחק זו ושמור שמה ב&quot;{siblings[0].name}&quot;
                              </button>
                            )}

                            {isSource && siblings.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSourceMergePickerId(prev => (prev === pickerKey ? null : pickerKey))
                                }
                                className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-600/25 hover:bg-amber-600/45 text-amber-200 border border-amber-500/40 transition-colors"
                                title="בחר באיזו תחנה אחרת לשמור את השם של תחנה זו לפני מחיקתה"
                              >
                                🔗 מחק זו ושמור שמה ב...
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (isPreviewing) stopPreview();
                                onDelete(s.stationuuid);
                              }}
                              className="px-2.5 py-1.5 rounded text-xs text-red-400 hover:bg-red-400/20"
                              title="מחק תחנה זו בלבד (ללא שמירת השם במקור)"
                            >
                              מחק
                            </button>
                          </div>
                        </div>

                        {isSource && siblings.length > 1 && showMultiMergePicker && (
                          <div className="p-2 rounded bg-bg-secondary border border-amber-500/35 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-amber-200 font-medium">
                              מחק את &quot;{s.name}&quot; ושמור את שמה בתוך (תישאר):
                            </span>
                            {siblings.map(target => (
                              <button
                                key={target.stationuuid}
                                type="button"
                                onClick={() => {
                                  if (isPreviewing) stopPreview();
                                  setSourceMergePickerId(null);
                                  onMergeAndDelete(target.stationuuid, s.stationuuid);
                                }}
                                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
                              >
                                {target.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDuplicatesTab;
