import React, { useState } from 'react';
import { Station } from '../../types';
import { getStationHttpsIssues } from '../../services/stationAdminUtils';
import StationLogoThumb from './StationLogoThumb';

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
  onQuickUpdateUrls: (uuid: string, updates: { url_resolved: string; favicon: string }) => void;
  playingKey: string | null;
  isAudioLoading: boolean;
  onTogglePlay: (key: string, url: string, label?: string) => void;
  onPreviewImage: (url: string, title: string, stationUuid: string) => void;
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
  onQuickUpdateUrls,
  playingKey,
  isAudioLoading,
  onTogglePlay,
  onPreviewImage,
  onEdit,
  onDelete,
  onMove,
}) => {
  const [inlineEditUuid, setInlineEditUuid] = useState<string | null>(null);
  const [draftStreamUrl, setDraftStreamUrl] = useState('');
  const [draftFaviconUrl, setDraftFaviconUrl] = useState('');

  const openInlineUrlEdit = (s: Station) => {
    if (inlineEditUuid === s.stationuuid) {
      setInlineEditUuid(null);
      return;
    }
    setInlineEditUuid(s.stationuuid);
    setDraftStreamUrl(s.url_resolved || '');
    setDraftFaviconUrl(s.favicon || '');
  };

  const saveInlineUrls = (uuid: string) => {
    onQuickUpdateUrls(uuid, {
      url_resolved: draftStreamUrl.trim(),
      favicon: draftFaviconUrl.trim(),
    });
    setInlineEditUuid(null);
  };

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
        const isInlineEditing = inlineEditUuid === s.stationuuid;
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
                  if (s.favicon?.trim()) onPreviewImage(s.favicon, s.name, s.stationuuid);
                  else openInlineUrlEdit(s);
                }}
                className="relative group w-11 h-11 bg-black object-contain rounded flex-shrink-0 border border-gray-700/60 hover:border-accent overflow-hidden cursor-zoom-in"
                title={s.favicon?.trim() ? 'לחץ להגדלה או עריכת קישור התמונה' : 'לחץ להוספת קישור תמונה'}
                aria-label={`הגדל לוגו של ${s.name}`}
              >
                <StationLogoThumb src={s.favicon} alt={s.name} sizeClass="w-11 h-11" />
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
                  onClick={() => openInlineUrlEdit(s)}
                  className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                    isInlineEditing
                      ? 'bg-sky-600 text-white'
                      : 'text-sky-300 hover:bg-sky-400/15'
                  }`}
                  title="ערוך ישירות קישור לשידור וקישור לתמונה"
                >
                  🔗 קישורים
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

            {isInlineEditing && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-bg-primary/80 border border-sky-500/35 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1">קישור לתחנה (Stream URL)</label>
                    <input
                      type="text"
                      value={draftStreamUrl}
                      onChange={e => setDraftStreamUrl(e.target.value)}
                      dir="ltr"
                      placeholder="https://..."
                      className="w-full px-2.5 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs font-mono text-left focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-secondary mb-1">קישור לתמונה (לוגו URL)</label>
                    <input
                      type="text"
                      value={draftFaviconUrl}
                      onChange={e => setDraftFaviconUrl(e.target.value)}
                      dir="ltr"
                      placeholder="https://..."
                      className="w-full px-2.5 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs font-mono text-left focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInlineEditUuid(null)}
                    className="px-2.5 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-200"
                  >
                    ביטול
                  </button>
                  <button
                    type="button"
                    onClick={() => saveInlineUrls(s.stationuuid)}
                    className="px-3 py-1 rounded text-xs font-semibold bg-accent hover:bg-accent-hover text-white"
                  >
                    ✓ שמור קישורים
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AdminStationList;
