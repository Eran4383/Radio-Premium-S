import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Station } from '../types';
import { fetchDefaultIsraeliStations } from '../services/radioService';
import { saveCustomStations, resetStationsInFirestore, fetchAdmins, addAdmin, removeAdmin } from '../services/settingsService';
import {
  getStationHttpsIssues,
  findPotentialDuplicates,
  mergeAliasesIntoStation,
  testStreamUrl,
  testImageUrl,
} from '../services/stationAdminUtils';
import { useAdminAudioPreview } from '../hooks/useAdminAudioPreview';
import { ChevronDownIcon } from './Icons';
import EditStationModal from './admin/EditStationModal';
import AdminStationList, { RowTestState } from './admin/AdminStationList';
import AdminAdminsTab from './admin/AdminAdminsTab';
import AdminDiagnosticsTab from './admin/AdminDiagnosticsTab';
import AdminDuplicatesTab from './admin/AdminDuplicatesTab';
import ImagePreviewModal from './admin/ImagePreviewModal';
import { LogPanel } from './admin/LogPanel';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStations: Station[];
  onStationsUpdate: (stations: Station[]) => void;
  currentUserEmail: string | null;
  favorites: string[];
}

type AdminSortType = 'default' | 'name_asc' | 'name_desc' | 'favorites' | 'https_issues';

interface DiagnosticResult {
  uuid: string;
  name: string;
  streamStatus: string;
  streamType: string;
  metadataStatus: string;
  latency: number;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, currentStations, onStationsUpdate, currentUserEmail, favorites }) => {
  const [stations, setStations] = useState<Station[]>(currentStations);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [activeTab, setActiveTab] = useState<'stations' | 'duplicates' | 'admins' | 'diagnostics' | 'logs'>('stations');
  const [admins, setAdmins] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortType, setSortType] = useState<AdminSortType>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyHttpsIssues, setOnlyHttpsIssues] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  const [rowTestResults, setRowTestResults] = useState<Record<string, RowTestState>>({});
  const [bulkProgress, setBulkProgress] = useState<{ running: boolean; completed: number; total: number } | null>(null);
  const bulkAbortRef = useRef(false);

  const [imagePreview, setImagePreview] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });

  const {
    playingKey,
    isLoading: isAudioLoading,
    error: audioPreviewError,
    togglePlay,
    stop: stopAudioPreview,
  } = useAdminAudioPreview();

  useEffect(() => {
    if (isOpen) {
      setStations(currentStations);
      fetchAdmins().then(setAdmins);
    } else {
      bulkAbortRef.current = true;
      stopAudioPreview();
    }
  }, [isOpen, currentStations, stopAudioPreview]);

  useEffect(() => {
    if (activeTab !== 'stations') {
      stopAudioPreview();
    }
  }, [activeTab, stopAudioPreview]);

  const httpsIssuesCount = useMemo(
    () => stations.filter(s => getStationHttpsIssues(s).hasHttpsIssue).length,
    [stations]
  );

  const duplicateGroupsCount = useMemo(
    () => findPotentialDuplicates(stations).length,
    [stations]
  );

  const handleSaveToCloud = async () => {
    setIsLoading(true);
    try {
      await saveCustomStations(stations);
      onStationsUpdate(stations);
      setStatusMsg('נשמר בהצלחה בענן!');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setStatusMsg('שגיאה בשמירה.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm('פעולה זו תמחק את כל השינויים ותחזיר את רשימת התחנות לברירת המחדל של האפליקציה. להמשיך?')) return;
    setIsLoading(true);
    try {
      await resetStationsInFirestore();
      const defaults = await fetchDefaultIsraeliStations();
      setStations(defaults);
      onStationsUpdate(defaults);
      setStatusMsg('שוחזר לברירת מחדל.');
    } catch (e) {
      console.error(e);
      setStatusMsg('שגיאה בשחזור.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStationSave = (updated: Station) => {
    setStations(prev => prev.map(s => (s.stationuuid === updated.stationuuid ? updated : s)));
    setEditingStation(null);
  };

  const handleDelete = (uuid: string) => {
    const target = stations.find(s => s.stationuuid === uuid);
    if (!confirm(`למחוק את התחנה "${target?.name || ''}"?`)) return;
    setStations(prev => prev.filter(s => s.stationuuid !== uuid));
  };

  const handleMergeAndDelete = (sourceUuid: string, duplicateUuid: string) => {
    const source = stations.find(s => s.stationuuid === sourceUuid);
    const duplicate = stations.find(s => s.stationuuid === duplicateUuid);
    if (!source || !duplicate || sourceUuid === duplicateUuid) return;

    const namesToMerge = [duplicate.name, ...(duplicate.aliases || [])];
    const updatedSource = mergeAliasesIntoStation(source, namesToMerge);

    setStations(prev =>
      prev
        .filter(s => s.stationuuid !== duplicateUuid)
        .map(s => (s.stationuuid === sourceUuid ? updatedSource : s))
    );
    setStatusMsg(`השם "${duplicate.name}" נשמר ככינוי של "${source.name}" והכפילות הוסרה (זכור ללחוץ "שמור לענן").`);
    setTimeout(() => setStatusMsg(''), 4500);
  };

  const handleAddStation = () => {
    const newStation: Station = {
      stationuuid: crypto.randomUUID(),
      name: 'תחנה חדשה',
      url_resolved: '',
      favicon: '',
      tags: '',
      countrycode: 'IL',
      codec: 'MP3',
      bitrate: 128,
    };
    setStations([newStation, ...stations]);
    setEditingStation(newStation);
    setSortType('default');
    setOnlyHttpsIssues(false);
    setSearchQuery('');
  };

  const moveStation = (uuid: string, direction: -1 | 1) => {
    const index = stations.findIndex(s => s.stationuuid === uuid);
    if (index === -1) return;
    const newStations = [...stations];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newStations.length) return;
    [newStations[index], newStations[targetIndex]] = [newStations[targetIndex], newStations[index]];
    setStations(newStations);
  };

  const runStationCheck = useCallback(async (station: Station) => {
    const issues = getStationHttpsIssues(station);
    const httpsStream = issues.streamIsHttp
      ? station.url_resolved.trim().replace(/^http:\/\//i, 'https://')
      : null;
    const httpsFavicon = issues.faviconIsHttp
      ? station.favicon.trim().replace(/^http:\/\//i, 'https://')
      : null;

    setRowTestResults(prev => ({
      ...prev,
      [station.stationuuid]: { loading: true },
    }));

    const [streamRes, imageRes, httpsStreamRes, httpsImageRes] = await Promise.all([
      testStreamUrl(station.url_resolved),
      testImageUrl(station.favicon),
      httpsStream ? testStreamUrl(httpsStream) : Promise.resolve(null),
      httpsFavicon ? testImageUrl(httpsFavicon) : Promise.resolve(null),
    ]);

    setRowTestResults(prev => ({
      ...prev,
      [station.stationuuid]: {
        loading: false,
        streamOk: streamRes.ok,
        streamMsg: streamRes.message,
        latencyMs: streamRes.latencyMs,
        faviconOk: imageRes.ok,
        httpsStreamOk: httpsStreamRes ? httpsStreamRes.ok : undefined,
        httpsStreamMsg: httpsStreamRes ? httpsStreamRes.message : undefined,
        httpsStreamLatencyMs: httpsStreamRes ? httpsStreamRes.latencyMs : undefined,
        httpsFaviconOk: httpsImageRes ? httpsImageRes.ok : undefined,
      },
    }));
  }, []);

  const displayedAdminStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...stations];

    if (onlyHttpsIssues) {
      list = list.filter(s => getStationHttpsIssues(s).hasHttpsIssue);
    }

    if (q) {
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          (s.aliases || []).some(a => a.toLowerCase().includes(q)) ||
          s.url_resolved.toLowerCase().includes(q) ||
          (s.favicon || '').toLowerCase().includes(q) ||
          (s.tags || '').toLowerCase().includes(q)
      );
    }

    switch (sortType) {
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      case 'name_desc':
        return list.sort((a, b) => b.name.localeCompare(a.name, 'he'));
      case 'favorites':
        return list.sort((a, b) => (favorites.includes(b.stationuuid) ? 1 : 0) - (favorites.includes(a.stationuuid) ? 1 : 0));
      case 'https_issues':
        return list.sort((a, b) => (getStationHttpsIssues(b).hasHttpsIssue ? 1 : 0) - (getStationHttpsIssues(a).hasHttpsIssue ? 1 : 0));
      default:
        return list;
    }
  }, [stations, searchQuery, onlyHttpsIssues, sortType, favorites]);

  const handleTestAllDisplayed = async () => {
    const queue = [...displayedAdminStations];
    const total = queue.length;
    if (total === 0) return;

    bulkAbortRef.current = false;
    setBulkProgress({ running: true, completed: 0, total });

    let completed = 0;
    const concurrency = 3;

    const worker = async () => {
      while (queue.length > 0 && !bulkAbortRef.current) {
        const nextStation = queue.shift();
        if (!nextStation) break;
        await runStationCheck(nextStation);
        if (bulkAbortRef.current) break;
        completed += 1;
        setBulkProgress({ running: true, completed, total });
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
    setBulkProgress(prev => (prev ? { ...prev, running: false } : null));
  };

  const handleStopBulkTest = () => {
    bulkAbortRef.current = true;
    setBulkProgress(prev => (prev ? { ...prev, running: false } : null));
  };

  const handleUpgradeFieldHttps = (uuid: string, field: 'stream' | 'favicon') => {
    setStations(prev =>
      prev.map(s => {
        if (s.stationuuid !== uuid) return s;
        if (field === 'stream' && s.url_resolved.trim().toLowerCase().startsWith('http://')) {
          return { ...s, url_resolved: s.url_resolved.trim().replace(/^http:\/\//i, 'https://') };
        }
        if (field === 'favicon' && s.favicon.trim().toLowerCase().startsWith('http://')) {
          return { ...s, favicon: s.favicon.trim().replace(/^http:\/\//i, 'https://') };
        }
        return s;
      })
    );
  };

  const upgradableHttpsSummary = useMemo(() => {
    let streamCount = 0;
    let faviconCount = 0;
    for (const s of stations) {
      const issues = getStationHttpsIssues(s);
      const t = rowTestResults[s.stationuuid];
      if (!t) continue;
      if (issues.streamIsHttp && t.httpsStreamOk) streamCount += 1;
      if (issues.faviconIsHttp && t.httpsFaviconOk) faviconCount += 1;
    }
    return { streamCount, faviconCount, total: streamCount + faviconCount };
  }, [stations, rowTestResults]);

  const handleUpgradeAllPassingHttps = () => {
    let upgradedStreams = 0;
    let upgradedFavicons = 0;
    setStations(prev =>
      prev.map(s => {
        const issues = getStationHttpsIssues(s);
        const t = rowTestResults[s.stationuuid];
        if (!t) return s;
        let next = s;
        if (issues.streamIsHttp && t.httpsStreamOk) {
          next = { ...next, url_resolved: next.url_resolved.trim().replace(/^http:\/\//i, 'https://') };
          upgradedStreams += 1;
        }
        if (issues.faviconIsHttp && t.httpsFaviconOk) {
          next = { ...next, favicon: next.favicon.trim().replace(/^http:\/\//i, 'https://') };
          upgradedFavicons += 1;
        }
        return next;
      })
    );
    if (upgradedStreams > 0 || upgradedFavicons > 0) {
      setStatusMsg(`שודרגו ${upgradedStreams} שידורים ו-${upgradedFavicons} סמלים ל-HTTPS. לחץ "שמור לענן" לשמירה.`);
      setTimeout(() => setStatusMsg(''), 4500);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    try {
      await addAdmin(newAdminEmail);
      setAdmins([...admins, newAdminEmail]);
      setNewAdminEmail('');
    } catch {
      setStatusMsg('שגיאה בהוספת מנהל.');
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`להסיר את ${email} מניהול?`)) return;
    try {
      await removeAdmin(email);
      setAdmins(admins.filter(a => a !== email));
    } catch {
      setStatusMsg('שגיאה בהסרת מנהל.');
    }
  };

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticResults([]);
    const results: DiagnosticResult[] = [];
    for (const station of stations) {
      const result: DiagnosticResult = {
        uuid: station.stationuuid,
        name: station.name,
        streamStatus: 'בודק...',
        streamType: '?',
        metadataStatus: 'N/A',
        latency: 0,
      };
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(station.url_resolved, { method: 'HEAD', mode: 'cors', signal: controller.signal }).catch(async () => {
          return await fetch(station.url_resolved, { method: 'GET', mode: 'cors', signal: controller.signal, headers: { Range: 'bytes=0-100' } });
        });
        clearTimeout(timeoutId);
        result.latency = Date.now() - start;
        if (response.ok) {
          result.streamStatus = '✅ תקין (ישיר)';
          const type = response.headers.get('content-type');
          if (type?.includes('mpegurl') || station.url_resolved.includes('.m3u8')) result.streamType = 'HLS (m3u8)';
          else if (type?.includes('mpeg') || type?.includes('audio')) result.streamType = 'MP3/AAC';
          else result.streamType = 'Unknown';
        } else result.streamStatus = `⚠️ שגיאה ${response.status}`;
      } catch {
        result.streamStatus = '❌ חסום (CORS)';
      }

      let metaUrl = '';
      if (station.stationuuid.startsWith('100fm-')) metaUrl = `https://digital.100fm.co.il/api/nowplaying/${station.stationuuid.replace('100fm-', '')}/12`;
      else if (station.name.includes('גלגלצ')) metaUrl = 'https://glz.co.il/umbraco/api/player/UpdatePlayer?stationid=glglz';
      else if (station.name.includes('כאן')) metaUrl = 'https://www.kan.org.il/radio/live-info-v2.aspx?stationId=954';
      else if (station.name.toLowerCase().includes('eco99')) metaUrl = 'https://firestore.googleapis.com/v1/projects/eco-99-production/databases/(default)/documents/streamed_content/program';

      if (metaUrl) {
        try {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 3000);
          const res = await fetch(metaUrl, { mode: 'cors', signal: controller.signal });
          if (res.ok) result.metadataStatus = '✅ תקין (ישיר)';
          else result.metadataStatus = `⚠️ שגיאה ${res.status}`;
        } catch {
          result.metadataStatus = '❌ חסום (CORS)';
        }
      }
      results.push(result);
      setDiagnosticResults([...results]);
    }
    setIsRunningDiagnostics(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col animate-fade-in-up overflow-hidden">
      {editingStation && (
        <EditStationModal
          station={editingStation}
          onSave={handleStationSave}
          onCancel={() => setEditingStation(null)}
        />
      )}

      <ImagePreviewModal
        isOpen={imagePreview.isOpen}
        imageUrl={imagePreview.url}
        title={imagePreview.title}
        onClose={() => setImagePreview(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="flex items-center justify-between p-4 bg-bg-secondary shadow-md shrink-0">
        <h2 className="text-xl font-bold text-accent">פאנל ניהול</h2>
        <button onClick={onClose} className="p-2" aria-label="סגור פאנל ניהול">
          <ChevronDownIcon className="w-6 h-6 rotate-180" />
        </button>
      </div>

      <div className="flex bg-bg-secondary/50 p-2 gap-1.5 shrink-0 overflow-x-auto">
        {(
          [
            { id: 'stations', label: `תחנות (${stations.length})` },
            { id: 'duplicates', label: `🔍 כפילויות${duplicateGroupsCount > 0 ? ` (${duplicateGroupsCount})` : ''}` },
            { id: 'admins', label: 'מנהלים' },
            { id: 'diagnostics', label: '🩺 דיאגנוסטיקה' },
            { id: 'logs', label: '📋 לוגים' },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-fit px-3 py-2 rounded text-xs sm:text-sm font-bold whitespace-nowrap ${
              activeTab === tab.id ? 'bg-accent text-white' : 'hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        {activeTab === 'stations' && (
          <>
            <div className="space-y-2 mb-4 sticky top-0 bg-bg-primary py-2 z-10 border-b border-gray-800">
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={handleSaveToCloud}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded font-bold shadow-lg text-sm flex-grow sm:flex-grow-0"
                >
                  {isLoading ? 'שומר...' : 'שמור לענן'}
                </button>
                <button
                  onClick={handleAddStation}
                  className="bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded shadow-lg text-sm flex-grow sm:flex-grow-0"
                >
                  + הוסף
                </button>
                {bulkProgress?.running ? (
                  <button
                    onClick={handleStopBulkTest}
                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-semibold shadow-lg text-xs sm:text-sm"
                  >
                    ⏹ עצור בדיקה ({bulkProgress.completed}/{bulkProgress.total})
                  </button>
                ) : (
                  <button
                    onClick={handleTestAllDisplayed}
                    disabled={displayedAdminStations.length === 0}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-2 rounded font-semibold shadow-lg text-xs sm:text-sm"
                    title="בודק אוטומטית את כל התחנות המוצגות (כולל בדיקת תאימות HTTPS)"
                  >
                    ⚡ בדוק הכל אוטומטית ({displayedAdminStations.length})
                  </button>
                )}
                {playingKey && (
                  <button
                    onClick={stopAudioPreview}
                    className="bg-red-600/80 hover:bg-red-600 text-white px-2.5 py-2 rounded text-xs font-semibold"
                  >
                    ⏹ עצור השמעה
                  </button>
                )}
                <select
                  value={sortType}
                  onChange={e => setSortType(e.target.value as AdminSortType)}
                  className="bg-gray-700 text-white text-xs p-2 rounded border border-gray-600 outline-none flex-grow sm:flex-grow-0"
                >
                  <option value="default">סדר שמור (ברירת מחדל)</option>
                  <option value="https_issues">בעיות HTTPS תחילה</option>
                  <option value="name_asc">שם (א-ת)</option>
                  <option value="name_desc">שם (ת-א)</option>
                  <option value="favorites">המועדפים שלי תחילה</option>
                </select>
                <button
                  onClick={handleResetToDefaults}
                  disabled={isLoading}
                  className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px] mr-auto"
                >
                  איפוס
                </button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="חפש תחנה לפי שם, כינוי, תגיות או כתובת..."
                  className="flex-grow min-w-[180px] px-3 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs text-text-primary focus:outline-none focus:border-accent"
                />
                {httpsIssuesCount > 0 && (
                  <button
                    onClick={() => setOnlyHttpsIssues(prev => !prev)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                      onlyHttpsIssues
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                    }`}
                  >
                    ⚠️ {onlyHttpsIssues ? 'מציג רק בעיות HTTPS' : `דורש בדיקת HTTPS (${httpsIssuesCount})`}
                  </button>
                )}
              </div>

              {bulkProgress && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span>
                      {bulkProgress.running
                        ? `בודק אוטומטית תחנות (${bulkProgress.completed} מתוך ${bulkProgress.total})...`
                        : `הבדיקה הושלמה (${bulkProgress.completed} מתוך ${bulkProgress.total} תחנות)`}
                    </span>
                    {upgradableHttpsSummary.total > 0 && (
                      <button
                        type="button"
                        onClick={handleUpgradeAllPassingHttps}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
                      >
                        🔒 שדרג את כל התקינים ל-HTTPS ({upgradableHttpsSummary.total})
                      </button>
                    )}
                  </div>
                  <progress
                    value={bulkProgress.completed}
                    max={bulkProgress.total || 1}
                    className="w-full h-1.5 rounded-full overflow-hidden accent-accent bg-gray-800 block"
                  />
                </div>
              )}

              {audioPreviewError && (
                <div className="p-2 rounded bg-red-500/15 border border-red-500/30 text-xs text-red-300">
                  ❌ {audioPreviewError}
                </div>
              )}
            </div>

            {statusMsg && <div className="p-2 mb-2 bg-blue-600 text-white text-center rounded animate-pulse text-sm">{statusMsg}</div>}
            <AdminStationList
              stations={displayedAdminStations}
              sortType={onlyHttpsIssues || searchQuery ? 'filtered' : sortType}
              favorites={favorites}
              testResults={rowTestResults}
              onQuickTest={runStationCheck}
              onUpgradeFieldHttps={handleUpgradeFieldHttps}
              playingKey={playingKey}
              isAudioLoading={isAudioLoading}
              onTogglePlay={togglePlay}
              onPreviewImage={(url, title) => setImagePreview({ isOpen: true, url, title })}
              onEdit={setEditingStation}
              onDelete={handleDelete}
              onMove={moveStation}
            />
          </>
        )}

        {activeTab === 'duplicates' && (
          <AdminDuplicatesTab
            stations={stations}
            favorites={favorites}
            onEdit={setEditingStation}
            onDelete={handleDelete}
            onMergeAndDelete={handleMergeAndDelete}
          />
        )}

        {activeTab === 'admins' && (
          <AdminAdminsTab
            admins={admins}
            newAdminEmail={newAdminEmail}
            onNewAdminEmailChange={setNewAdminEmail}
            onAddAdmin={handleAddAdmin}
            onRemoveAdmin={handleRemoveAdmin}
            currentUserEmail={currentUserEmail}
          />
        )}
        {activeTab === 'diagnostics' && (
          <AdminDiagnosticsTab
            isRunningDiagnostics={isRunningDiagnostics}
            onRunDiagnostics={runDiagnostics}
            diagnosticResults={diagnosticResults}
          />
        )}
        {activeTab === 'logs' && <LogPanel />}
      </div>
    </div>
  );
};

export default AdminPanel;
