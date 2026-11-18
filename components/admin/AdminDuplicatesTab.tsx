import React, { useMemo, useState } from 'react';
import { Station } from '../../types';
import { findPotentialDuplicates, getStationHttpsIssues } from '../../services/stationAdminUtils';
import { useAdminAudioPreview } from '../../hooks/useAdminAudioPreview';

interface AdminDuplicatesTabProps {
  stations: Station[];
  favorites: string[];
  onEdit: (station: Station) => void;
  onDelete: (uuid: string) => void;
  onMergeAndDelete: (sourceUuid: string, duplicateUuid: string) => void;
}

const AdminDuplicatesTab: React.FC<AdminDuplicatesTabProps> = ({
  stations,
  favorites,
  onEdit,
  onDelete,
  onMergeAndDelete,
}) => {
  const [ignoredGroupIds, setIgnoredGroupIds] = useState<string[]>([]);
  const [selectedSourceByGroup, setSelectedSourceByGroup] = useState<Record<string, string>>({});
  const { playingKey, error: previewError, togglePlay, stop: stopPreview } = useAdminAudioPreview();

  const duplicateGroups = useMemo(() => {
    return findPotentialDuplicates(stations).filter(g => !ignoredGroupIds.includes(g.id));
  }, [stations, ignoredGroupIds]);

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
          {playingKey && (
            <button
              onClick={stopPreview}
              className="px-3 py-1 text-xs font-semibold rounded bg-red-600 hover:bg-red-500 text-white"
            >
              ⏹ עצור השמעת בדיקה
            </button>
          )}
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          הכלי מאתר תחנות החשודות ככפולות לפי כתובת שידור זהה, כינוי שמור, לוגו זהה או שם דומה.
          בכל קבוצה סמן את <strong>תחנת המקור</strong>, ואז תוכל ללחוץ <strong>&quot;מחק ושמור שם במקור&quot;</strong> כדי למחוק את הכפילות ולהוסיף את שמה אל תחנת המקור (כך שהמערכת תזהה אותה גם בעתיד).
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
                    onClick={() => setIgnoredGroupIds(prev => [...prev, group.id])}
                    className="px-2.5 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                  >
                    ✓ אלו תחנות שונות (הסתר)
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

                    return (
                      <div
                        key={s.stationuuid}
                        className={`p-2.5 rounded-lg bg-bg-primary border flex flex-col gap-2.5 ${
                          isSource ? 'border-accent/60' : 'border-gray-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-start gap-2.5 flex-grow min-w-0">
                            <img
                              src={s.favicon}
                              alt={s.name}
                              className="w-10 h-10 rounded bg-black object-contain flex-shrink-0 border border-gray-700"
                              onError={e => { (e.target as HTMLImageElement).src = ''; }}
                            />
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
                            <button
                              type="button"
                              onClick={() => {
                                if (isPreviewing) stopPreview();
                                onDelete(s.stationuuid);
                              }}
                              className="px-2.5 py-1.5 rounded text-xs text-red-400 hover:bg-red-400/20"
                              title="מחק ללא שמירת השם במקור"
                            >
                              מחק
                            </button>
                          </div>
                        </div>
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
