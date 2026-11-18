import React from 'react';
import { Station } from '../../types';
import { getStationHttpsIssues } from '../../services/stationAdminUtils';

export interface RowTestState {
  loading: boolean;
  streamOk?: boolean;
  streamMsg?: string;
  faviconOk?: boolean;
  latencyMs?: number;
  httpsStreamOk?: boolean;
  httpsStreamMsg?: string;
  httpsStreamLatencyMs?: number;
  httpsFaviconOk?: boolean;
}

interface AdminStationListProps {
  stations: Station[];
  sortType: string;
  favorites: string[];
  testResults: Record<string, RowTestState>;
  onQuickTest: (station: Station) => void;
  onUpgradeFieldHttps: (uuid: string, field: 'stream' | 'favicon') => void;
  playingKey: string | null;
  isAudioLoading: boolean;
  onTogglePlay: (key: string, url: string, label?: string) => void;
  onPreviewImage: (url: string, title: string) => void;
  onEdit: (station: Station) => void;
  onDelete: (uuid: string) => void;
  onMove: (uuid: string, direction: -1 | 1) => void;
}

const AdminStationList: React.FC<AdminStationListProps> = ({
  stations,
  sortType,
  favorites,
  testResults,
  onQuickTest,
  onUpgradeFieldHttps,
  playingKey,
  isAudioLoading,
  onTogglePlay,
  onPreviewImage,
  onEdit,
  onDelete,
  onMove,
}) => {
  if (stations.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        לא נמצאו תחנות התואמות לחיפוש או לסינון.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stations.map((s, idx) => {
        const issues = getStationHttpsIssues(s);
        const test = testResults[s.stationuuid];
        const isFav = favorites.includes(s.stationuuid);
        const sourcePlayKey = `row-src:${s.stationuuid}`;
        const httpsPlayKey = `row-https:${s.stationuuid}`;
        const isPlayingSource = playingKey === sourcePlayKey;
        const isPlayingHttps = playingKey === httpsPlayKey;
        const httpsStreamUrl = issues.streamIsHttp
          ? s.url_resolved.trim().replace(/^http:\/\//i, 'https://')
          : '';

        return (
          <div
            key={s.stationuuid}
            className={`bg-bg-secondary p-3 rounded-lg border transition-colors ${
              issues.hasHttpsIssue
                ? 'border-amber-500/40 hover:border-amber-400/70'
                : 'border-gray-800 hover:border-accent/50'
            }`}
          >
            <div className="flex items-start gap-3">
              {sortType === 'default' && (
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => onMove(s.stationuuid, -1)}
                    disabled={idx === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                    aria-label="הזז למעלה"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onMove(s.stationuuid, 1)}
                    disabled={idx === stations.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                    aria-label="הזז למטה"
                  >
                    ▼
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (s.favicon?.trim()) onPreviewImage(s.favicon, s.name);
                }}
                disabled={!s.favicon?.trim()}
                className="relative group w-11 h-11 bg-black object-contain rounded flex-shrink-0 border border-gray-700/60 hover:border-accent overflow-hidden cursor-zoom-in disabled:cursor-default"
                title={s.favicon?.trim() ? 'לחץ להגדלת התמונה' : undefined}
                aria-label={`הגדל לוגו של ${s.name}`}
              >
                <img
                  src={s.favicon}
                  alt={s.name}
                  className="w-full h-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).src = ''; }}
                />
              </button>

              <div className="flex-grow min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-sm text-text-primary">{s.name}</span>
                  {isFav && <span title="במועדפים" className="text-xs">⭐</span>}
                  {issues.streamIsHttp && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚠️ שידור HTTP
                    </span>
                  )}
                  {issues.faviconIsHttp && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚠️ לוגו HTTP
                    </span>
                  )}
                  {issues.missingFavicon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      חסר לוגו
                    </span>
                  )}
                </div>

                {s.aliases && s.aliases.length > 0 && (
                  <div className="text-[11px] text-sky-300/90">
                    שמות נוספים: {s.aliases.join(' · ')}
                  </div>
                )}

                <div
                  className="text-[11px] text-text-secondary font-mono break-all line-clamp-2 text-left leading-tight"
                  dir="ltr"
                  title={s.url_resolved}
                >
                  {s.url_resolved}
                </div>

                {test && test.loading && (
                  <div className="text-[11px] text-blue-300 pt-0.5 animate-pulse">
                    ⏳ בודק שידור, לוגו ותאימות HTTPS...
                  </div>
                )}

                {test && !test.loading && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                    <span className={test.streamOk ? 'text-emerald-400' : 'text-red-400'}>
                      {test.streamOk ? `✅ שידור תקין (${test.latencyMs}ms)` : `❌ ${test.streamMsg}`}
                    </span>
                    <span className={test.faviconOk ? 'text-emerald-400' : 'text-amber-400'}>
                      {test.faviconOk ? '✅ לוגו תקין' : '⚠️ לוגו לא נטען'}
                    </span>

                    {issues.streamIsHttp && typeof test.httpsStreamOk === 'boolean' && (
                      test.httpsStreamOk ? (
                        <button
                          type="button"
                          onClick={() => onUpgradeFieldHttps(s.stationuuid, 'stream')}
                          className="px-2 py-0.5 rounded bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-200 border border-emerald-500/40 font-semibold transition-colors"
                        >
                          🔒 שדרג שידור ל-HTTPS ({test.httpsStreamLatencyMs}ms)
                        </button>
                      ) : (
                        <span className="text-amber-400/90">
                          ⚠️ שידור לא זמין ב-HTTPS
                        </span>
                      )
                    )}

                    {issues.faviconIsHttp && typeof test.httpsFaviconOk === 'boolean' && (
                      test.httpsFaviconOk ? (
                        <button
                          type="button"
                          onClick={() => onUpgradeFieldHttps(s.stationuuid, 'favicon')}
                          className="px-2 py-0.5 rounded bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-200 border border-emerald-500/40 font-semibold transition-colors"
                        >
                          🖼️ שדרג לוגו ל-HTTPS
                        </button>
                      ) : (
                        <span className="text-amber-400/90">
                          ⚠️ לוגו לא זמין ב-HTTPS
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap gap-1 flex-shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => onTogglePlay(sourcePlayKey, s.url_resolved, s.name)}
                  disabled={!s.url_resolved?.trim()}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-40 ${
                    isPlayingSource
                      ? 'bg-red-600 text-white'
                      : 'text-emerald-300 hover:bg-emerald-500/15'
                  }`}
                  title={issues.streamIsHttp ? 'האזן למקור (HTTP)' : 'האזן לתחנה'}
                >
                  {isPlayingSource ? (isAudioLoading ? '⏳ עצור' : '⏹ עצור') : '▶ האזן'}
                </button>
                {issues.streamIsHttp && (
                  <button
                    type="button"
                    onClick={() => onTogglePlay(httpsPlayKey, httpsStreamUrl, `${s.name} (HTTPS)`)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                      isPlayingHttps
                        ? 'bg-red-600 text-white'
                        : 'text-teal-300 hover:bg-teal-500/15'
                    }`}
                    title="האזן לניסיון HTTPS כדי לוודא שמיעה תקינה"
                  >
                    {isPlayingHttps ? (isAudioLoading ? '⏳ עצור' : '⏹ עצור') : '🔊 HTTPS'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onQuickTest(s)}
                  disabled={test?.loading}
                  className="px-2.5 py-1.5 text-emerald-400 hover:bg-emerald-400/15 rounded text-xs font-medium disabled:opacity-50"
                  title="בדוק תקינות שידור ולוגו (כולל תאימות HTTPS)"
                >
                  {test?.loading ? 'בודק...' : 'בדוק'}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="px-2.5 py-1.5 text-blue-400 hover:bg-blue-400/15 rounded text-xs font-medium"
                >
                  ערוך
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(s.stationuuid)}
                  className="px-2.5 py-1.5 text-red-400 hover:bg-red-400/15 rounded text-xs font-medium"
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStationList;
