import React, { useState } from 'react';
import { ArchivedNonHttpsStation, Station } from '../../types';
import { getStationHttpsIssues, testImageUrl, testStreamUrl } from '../../services/stationAdminUtils';
import { useAdminAudioPreview } from '../../hooks/useAdminAudioPreview';

interface ArchiveCheckResult {
  loading: boolean;
  httpsStreamOk?: boolean;
  httpsStreamMsg?: string;
  httpsStreamLatencyMs?: number;
  httpsFaviconOk?: boolean;
}

interface AdminNonHttpsArchiveTabProps {
  archivedStations: ArchivedNonHttpsStation[];
  onRestoreStation: (entry: ArchivedNonHttpsStation, upgradePassingHttps?: boolean) => void;
  onEditBeforeRestore: (entry: ArchivedNonHttpsStation) => void;
  onUpdateArchivedStation: (id: string, updatedStation: Station, updatedReason?: string) => void;
  onRemoveFromArchive: (id: string) => void;
  onPreviewImage: (url: string, title: string, onSaveUrl?: (newUrl: string) => void) => void;
}

const formatDateTimeHe = (ts?: number) => {
  if (!ts) return 'לא ידוע';
  try {
    return new Date(ts).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const AdminNonHttpsArchiveTab: React.FC<AdminNonHttpsArchiveTabProps> = ({
  archivedStations,
  onRestoreStation,
  onEditBeforeRestore,
  onUpdateArchivedStation,
  onRemoveFromArchive,
  onPreviewImage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkResults, setCheckResults] = useState<Record<string, ArchiveCheckResult>>({});
  const [isBulkChecking, setIsBulkChecking] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [draftStream, setDraftStream] = useState('');
  const [draftFavicon, setDraftFavicon] = useState('');
  const [draftReason, setDraftReason] = useState('');

  const { playingKey, isLoading: isAudioLoading, error: audioError, togglePlay, stop } = useAdminAudioPreview();

  const filtered = archivedStations.filter(entry => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const s = entry.station;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.aliases || []).some(a => a.toLowerCase().includes(q)) ||
      s.url_resolved.toLowerCase().includes(q) ||
      (entry.reason || '').toLowerCase().includes(q)
    );
  });

  const checkEntryHttps = async (entry: ArchivedNonHttpsStation) => {
    const s = entry.station;
    const issues = getStationHttpsIssues(s);
    const streamCandidate = issues.streamIsHttp
      ? s.url_resolved.trim().replace(/^http:\/\//i, 'https://')
      : s.url_resolved.trim();
    const faviconCandidate = issues.faviconIsHttp
      ? s.favicon.trim().replace(/^http:\/\//i, 'https://')
      : s.favicon.trim();

    setCheckResults(prev => ({ ...prev, [entry.id]: { loading: true } }));
    const [streamRes, faviconRes] = await Promise.all([
      testStreamUrl(streamCandidate),
      faviconCandidate ? testImageUrl(faviconCandidate) : Promise.resolve({ ok: false, message: 'חסר לוגו' }),
    ]);

    setCheckResults(prev => ({
      ...prev,
      [entry.id]: {
        loading: false,
        httpsStreamOk: streamRes.ok,
        httpsStreamMsg: streamRes.message,
        httpsStreamLatencyMs: streamRes.latencyMs,
        httpsFaviconOk: faviconRes.ok,
      },
    }));
  };

  const handleBulkCheckArchive = async () => {
    if (filtered.length === 0) return;
    setIsBulkChecking(true);
    for (const entry of filtered) {
      await checkEntryHttps(entry);
    }
    setIsBulkChecking(false);
  };

  const startInlineEdit = (entry: ArchivedNonHttpsStation) => {
    setEditingEntryId(entry.id);
    setDraftStream(entry.station.url_resolved);
    setDraftFavicon(entry.station.favicon);
    setDraftReason(entry.reason || '');
  };

  const saveInlineEdit = (entry: ArchivedNonHttpsStation) => {
    onUpdateArchivedStation(
      entry.id,
      {
        ...entry.station,
        url_resolved: draftStream.trim(),
        favicon: draftFavicon.trim(),
      },
      draftReason.trim()
    );
    setEditingEntryId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-bg-secondary p-4 rounded-lg border border-amber-500/30 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-text-primary">
            📦 מעקב תחנות שנמחקו עקב חוסר ב-HTTPS ({archivedStations.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {playingKey && (
              <button
                type="button"
                onClick={stop}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-red-600 hover:bg-red-500 text-white"
              >
                ⏹ עצור השמעה
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkCheckArchive}
              disabled={isBulkChecking || filtered.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
            >
              {isBulkChecking ? '⏳ בודק HTTPS...' : `⚡ בדוק HTTPS לכל הארכיון (${filtered.length})`}
            </button>
          </div>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          כאן נשמרות תחנות שהוסרו מהרשימה הראשית בגלל היעדר כתובת HTTPS תקינה. תוכל להאזין, לבדוק מדי פעם אם השרת תומך כבר ב-HTTPS, לערוך כתובות ולהחזיר אותן לרשימה ברגע שימצא קישור תקין.
        </p>

        {archivedStations.length > 0 && (
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="חפש בארכיון לפי שם, כינוי, סיבה או כתובת..."
            className="w-full px-3 py-1.5 rounded bg-bg-primary border border-gray-700 text-xs text-text-primary focus:outline-none focus:border-accent"
          />
        )}

        {audioError && (
          <div className="p-2 rounded bg-red-500/15 border border-red-500/30 text-xs text-red-300">
            ❌ {audioError}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-bg-secondary p-8 rounded-lg text-center text-text-secondary text-sm">
          {archivedStations.length === 0
            ? 'אין כרגע תחנות שמורות בארכיון מעקב HTTPS.'
            : 'לא נמצאו תחנות בארכיון התואמות לחיפוש.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(entry => {
            const s = entry.station;
            const issues = getStationHttpsIssues(s);
            const res = checkResults[entry.id];
            const isEditing = editingEntryId === entry.id;
            const httpsStreamUrl = issues.streamIsHttp
              ? s.url_resolved.trim().replace(/^http:\/\//i, 'https://')
              : s.url_resolved.trim();
            const srcKey = `arch-src:${entry.id}`;
            const httpsKey = `arch-https:${entry.id}`;

            return (
              <div key={entry.id} className="bg-bg-secondary p-3 rounded-lg border border-gray-700/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (s.favicon?.trim()) {
                        onPreviewImage(s.favicon, s.name, (newUrl) =>
                          onUpdateArchivedStation(entry.id, { ...s, favicon: newUrl })
                        );
                      }
                    }}
                    disabled={!s.favicon?.trim()}
                    className="w-11 h-11 rounded bg-black border border-gray-700 flex-shrink-0 overflow-hidden cursor-zoom-in disabled:cursor-default"
                    title={s.favicon?.trim() ? 'לחץ להגדלת התמונה' : undefined}
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
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                        נמחק: {formatDateTimeHe(entry.deletedAt)}
                      </span>
                      {s.codec && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                          {s.codec} • {s.bitrate || 0}k
                        </span>
                      )}
                    </div>

                    {entry.reason && (
                      <div className="text-[11px] text-amber-300/90">
                        סיבה: {entry.reason}
                      </div>
                    )}

                    {s.aliases && s.aliases.length > 0 && (
                      <div className="text-[11px] text-sky-300/90">
                        שמות נוספים: {s.aliases.join(' · ')}
                      </div>
                    )}

                    <div className="text-[11px] font-mono text-text-secondary break-all text-left" dir="ltr">
                      <div>שידור: {s.url_resolved || '(ריק)'}</div>
                      {s.favicon && <div className="opacity-80">לוגו: {s.favicon}</div>}
                    </div>

                    {res?.loading && (
                      <div className="text-[11px] text-blue-300 animate-pulse">⏳ בודק זמינות HTTPS...</div>
                    )}
                    {res && !res.loading && (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
                        <span className={res.httpsStreamOk ? 'text-emerald-400 font-semibold' : 'text-red-400'}>
                          {res.httpsStreamOk
                            ? `✅ שידור עובד ב-HTTPS! (${res.httpsStreamLatencyMs}ms)`
                            : `❌ שידור עדיין נכשל ב-HTTPS (${res.httpsStreamMsg})`}
                        </span>
                        {s.favicon && (
                          <span className={res.httpsFaviconOk ? 'text-emerald-400' : 'text-amber-400'}>
                            {res.httpsFaviconOk ? '✅ לוגו זמין ב-HTTPS' : '⚠️ לוגו לא זמין ב-HTTPS'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 flex-shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => togglePlay(srcKey, s.url_resolved, s.name)}
                      disabled={!s.url_resolved?.trim()}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium disabled:opacity-40 ${
                        playingKey === srcKey ? 'bg-red-600 text-white' : 'text-emerald-300 hover:bg-emerald-500/15'
                      }`}
                    >
                      {playingKey === srcKey ? (isAudioLoading ? '⏳ עצור' : '⏹ עצור') : '▶ מקור'}
                    </button>
                    {issues.streamIsHttp && (
                      <button
                        type="button"
                        onClick={() => togglePlay(httpsKey, httpsStreamUrl, `${s.name} (HTTPS)`)}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium ${
                          playingKey === httpsKey ? 'bg-red-600 text-white' : 'text-teal-300 hover:bg-teal-500/15'
                        }`}
                      >
                        {playingKey === httpsKey ? (isAudioLoading ? '⏳ עצור' : '⏹ עצור') : '🔊 HTTPS'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => checkEntryHttps(entry)}
                      disabled={res?.loading}
                      className="px-2.5 py-1.5 rounded text-xs font-medium text-blue-300 hover:bg-blue-500/15 disabled:opacity-40"
                    >
                      🔍 בדוק HTTPS
                    </button>
                    <button
                      type="button"
                      onClick={() => (isEditing ? setEditingEntryId(null) : startInlineEdit(entry))}
                      className="px-2.5 py-1.5 rounded text-xs font-medium text-sky-300 hover:bg-sky-500/15"
                    >
                      ✏️ ערוך קישורים
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditBeforeRestore(entry)}
                      className="px-2.5 py-1.5 rounded text-xs font-medium text-amber-300 hover:bg-amber-500/15"
                      title="פתח בחלון עריכה המלא והוסף מחדש"
                    >
                      ערוך והחזר
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stop();
                        onRestoreStation(entry, Boolean(res?.httpsStreamOk || res?.httpsFaviconOk));
                      }}
                      className="px-2.5 py-1.5 rounded text-xs font-semibold bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-200 border border-emerald-500/40"
                    >
                      ♻️ הוסף מחדש
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`להסיר את "${s.name}" מהארכיון לצמיתות?`)) {
                          onRemoveFromArchive(entry.id);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded text-xs font-medium text-red-400 hover:bg-red-400/15"
                    >
                      מחק לצמיתות
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="p-2.5 rounded-lg bg-bg-primary/80 border border-gray-700 space-y-2">
                    <div>
                      <label className="block text-[11px] text-text-secondary mb-1">קישור לתחנה (Stream URL)</label>
                      <input
                        type="text"
                        value={draftStream}
                        onChange={e => setDraftStream(e.target.value)}
                        dir="ltr"
                        className="w-full px-2.5 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs font-mono text-left focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-secondary mb-1">קישור לתמונה (לוגו URL)</label>
                      <input
                        type="text"
                        value={draftFavicon}
                        onChange={e => setDraftFavicon(e.target.value)}
                        dir="ltr"
                        className="w-full px-2.5 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs font-mono text-left focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-text-secondary mb-1">הערה / סיבה</label>
                      <input
                        type="text"
                        value={draftReason}
                        onChange={e => setDraftReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingEntryId(null)}
                        className="px-2.5 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-200"
                      >
                        ביטול
                      </button>
                      <button
                        type="button"
                        onClick={() => saveInlineEdit(entry)}
                        className="px-3 py-1 rounded text-xs font-semibold bg-accent hover:bg-accent-hover text-white"
                      >
                        שמור עדכון בארכיון
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminNonHttpsArchiveTab;
