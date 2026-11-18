import React, { useMemo, useState } from 'react';
import { Station } from '../../types';
import { findPotentialDuplicates, getStationHttpsIssues } from '../../services/stationAdminUtils';
import { useAdminAudioPreview } from '../../hooks/useAdminAudioPreview';

interface AdminDuplicatesTabProps {
  stations: Station[];
  favorites: string[];
  ignoredPairKeys: string[];
  onEdit: (station: Station) => void;
  onDelete: (uuid: string) => void;
  onMergeAndDelete: (sourceUuid: string, duplicateUuid: string) => void;
  onMarkNotDuplicates: (groupStations: Station[]) => void;
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
  onMarkNotDuplicates,
  onResetIgnoredPairs,
  onPreviewImage,
}) => {
  const [selectedSourceByGroup, setSelectedSourceByGroup] = useState<Record<string, string>>({});
  const [sourceMergePickerId, setSourceMergePickerId] = useState<string | null>(null);
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

  return (
    <div className="space-y-4">
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
          הכלי מאתר תחנות החשודות ככפולות לפי כתובת שידור זהה, כינוי שמור, לוגו זהה או שם דומה.
          בכל תחנה ניתן ללחוץ <strong>&quot;מחק ושמור שם&quot;</strong> כדי למחוק אותה ולהוסיף את שמה לתחנה שתישאר,
          או לסמן <strong>&quot;אלו תחנות שונות&quot;</strong> כך שזוג תחנות אלו לא יוצג שוב יחד (אך עדיין יזוהה אם יצטרף גורם שלישי).
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
                  <button
                    type="button"
                    onClick={() => onMarkNotDuplicates(group.stations)}
                    className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                    title="שמור שזוגות אלו אינם כפילות — הם לא יוצגו שוב יחד בעתיד, אך עדיין יזוהו מול תחנות אחרות"
                  >
                    ✓ אלו תחנות שונות (אל תזהה יחד שוב)
                  </button>
                </div>

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
                    const siblings = group.stations.filter(x => x.stationuuid !== s.stationuuid);
                    const pickerKey = `${group.id}:${s.stationuuid}`;
                    const showMultiMergePicker = sourceMergePickerId === pickerKey;

                    return (
                      <div
                        key={s.stationuuid}
                        className={`p-2.5 rounded-lg bg-bg-primary border flex flex-col gap-2.5 ${
                          isSource ? 'border-accent/60' : 'border-gray-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-start gap-2.5 flex-grow min-w-0">
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
                                {isSource && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/40 font-semibold">
                                    תחנת מקור
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
                                className="px-2.5 py-1.5 rounded text-xs bg-gray-700/80 hover:bg-gray-600 text-gray-200 transition-colors"
                                title="קבע תחנה זו כתחנת המקור שתישאר"
                              >
                                קבע כמקור
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onEdit(s)}
                              className="px-2.5 py-1.5 rounded text-xs text-blue-400 hover:bg-blue-400/20"
                            >
                              ערוך
                            </button>

                            {!isSource && activeSourceStation && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isPreviewing) stopPreview();
                                  onMergeAndDelete(activeSourceStation.stationuuid, s.stationuuid);
                                }}
                                className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-600/25 hover:bg-amber-600/45 text-amber-200 border border-amber-500/40 transition-colors"
                                title={`מחק תחנה זו והוסף את השם "${s.name}" לכינויים של "${activeSourceStation.name}"`}
                              >
                                🔗 מחק ושמור שם במקור
                              </button>
                            )}

                            {isSource && siblings.length === 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isPreviewing) stopPreview();
                                  onMergeAndDelete(siblings[0].stationuuid, s.stationuuid);
                                }}
                                className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-600/25 hover:bg-amber-600/45 text-amber-200 border border-amber-500/40 transition-colors"
                                title={`מחק תחנה זו והעבר את השם "${s.name}" אל "${siblings[0].name}"`}
                              >
                                🔗 מחק ושמור שם ב&quot;{siblings[0].name}&quot;
                              </button>
                            )}

                            {isSource && siblings.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSourceMergePickerId(prev => (prev === pickerKey ? null : pickerKey))
                                }
                                className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-600/25 hover:bg-amber-600/45 text-amber-200 border border-amber-500/40 transition-colors"
                                title="בחר באיזו תחנה אחרת לשמור את השם לפני מחיקה"
                              >
                                🔗 מחק ושמור שם ב...
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (isPreviewing) stopPreview();
                                onDelete(s.stationuuid);
                              }}
                              className="px-2.5 py-1.5 rounded text-xs text-red-400 hover:bg-red-400/20"
                              title="מחק ללא שמירת השם"
                            >
                              מחק
                            </button>
                          </div>
                        </div>

                        {isSource && siblings.length > 1 && showMultiMergePicker && (
                          <div className="p-2 rounded bg-bg-secondary border border-amber-500/35 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-amber-200 font-medium">שמור את השם &quot;{s.name}&quot; ב:</span>
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
