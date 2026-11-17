import React, { useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Station } from '../../types';
import { findPotentialDuplicates, getStationHttpsIssues } from '../../services/stationAdminUtils';

interface AdminDuplicatesTabProps {
  stations: Station[];
  favorites: string[];
  onEdit: (station: Station) => void;
  onDelete: (uuid: string) => void;
}

const AdminDuplicatesTab: React.FC<AdminDuplicatesTabProps> = ({
  stations,
  favorites,
  onEdit,
  onDelete,
}) => {
  const [ignoredGroupIds, setIgnoredGroupIds] = useState<string[]>([]);
  const [previewUuid, setPreviewUuid] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const stopPreview = () => {
    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {}
    }
    setPreviewUuid(null);
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  const handleTogglePreview = (station: Station) => {
    setPreviewError(null);
    if (previewUuid === station.stationuuid) {
      stopPreview();
      return;
    }

    stopPreview();

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    const url = station.url_resolved;
    setPreviewUuid(station.stationuuid);

    if (url.toLowerCase().includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false, lowLatencyMode: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(audio);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.play().catch(() => {
          setPreviewError(`לא ניתן להשמיע את ${station.name}`);
          stopPreview();
        });
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setPreviewError(`שגיאה בטעינת השידור של ${station.name}`);
          stopPreview();
        }
      });
    } else {
      audio.src = url;
      audio.play().catch(() => {
        setPreviewError(`לא ניתן להשמיע את ${station.name}`);
        stopPreview();
      });
    }
  };

  const duplicateGroups = useMemo(() => {
    return findPotentialDuplicates(stations).filter(g => !ignoredGroupIds.includes(g.id));
  }, [stations, ignoredGroupIds]);

  return (
    <div className="space-y-4">
      <div className="bg-bg-secondary p-4 rounded-lg border border-blue-500/30 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-text-primary">🔍 איתור כפילויות בטוח (ללא מחיקה אוטומטית)</h3>
          {previewUuid && (
            <button
              onClick={stopPreview}
              className="px-3 py-1 text-xs font-semibold rounded bg-red-600 hover:bg-red-500 text-white"
            >
              ⏹ עצור השמעת בדיקה
            </button>
          )}
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          הכלי מאתר תחנות החשודות ככפולות לפי כתובת שידור זהה, לוגו זהה, או שם דומה — תוך הפרדה זהירה מערוצי משנה ותדרים שונים.
          שום תחנה לא נמחקת אוטומטית: אפשר להאזין לכל מקור ישירות מכאן, לערוך, למחוק ידנית, או לסמן קבוצה כ&quot;תחנות שונות&quot;.
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
          {duplicateGroups.map(group => (
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
                  const isPreviewing = previewUuid === s.stationuuid;
                  const isFav = favorites.includes(s.stationuuid);

                  return (
                    <div key={s.stationuuid} className="p-2.5 rounded-lg bg-bg-primary border border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3">
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
                          <div className="text-[11px] font-mono text-text-secondary break-all text-left" dir="ltr">
                            {s.url_resolved}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 justify-end">
                        <button
                          onClick={() => handleTogglePreview(s)}
                          className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                            isPreviewing
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300'
                          }`}
                        >
                          {isPreviewing ? '⏹ עצור' : '▶ האזן'}
                        </button>
                        <button
                          onClick={() => onEdit(s)}
                          className="px-2.5 py-1.5 rounded text-xs text-blue-400 hover:bg-blue-400/20"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => {
                            if (isPreviewing) stopPreview();
                            onDelete(s.stationuuid);
                          }}
                          className="px-2.5 py-1.5 rounded text-xs text-red-400 hover:bg-red-400/20"
                        >
                          מחק
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDuplicatesTab;
