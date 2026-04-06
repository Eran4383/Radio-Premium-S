import React, { useState, useEffect } from 'react';
import { Station } from '../types';
import { fetchDefaultIsraeliStations } from '../services/radioService';
import { saveCustomStations, resetStationsInFirestore, fetchAdmins, addAdmin, removeAdmin } from '../services/settingsService';
import { ChevronDownIcon } from './Icons';
import EditStationModal from './admin/EditStationModal';
import AdminStationList from './admin/AdminStationList';
import AdminAdminsTab from './admin/AdminAdminsTab';
import AdminDiagnosticsTab from './admin/AdminDiagnosticsTab';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentStations: Station[];
  onStationsUpdate: (stations: Station[]) => void;
  currentUserEmail: string | null;
  favorites: string[];
}

type AdminSortType = 'default' | 'name_asc' | 'name_desc' | 'favorites';

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
    const [activeTab, setActiveTab] = useState<'stations' | 'admins' | 'diagnostics'>('stations');
    const [admins, setAdmins] = useState<string[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sortType, setSortType] = useState<AdminSortType>('default');
    const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);
    const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

    useEffect(() => { if (isOpen) { setStations(currentStations); fetchAdmins().then(setAdmins); } }, [isOpen, currentStations]);

    const handleSaveToCloud = async () => {
        setIsLoading(true);
        try { await saveCustomStations(stations); onStationsUpdate(stations); setStatusMsg('נשמר בהצלחה בענן!'); setTimeout(() => setStatusMsg(''), 3000); }
        catch (e) { console.error(e); setStatusMsg('שגיאה בשמירה.'); } finally { setIsLoading(false); }
    };

    const handleResetToDefaults = async () => {
        if (!confirm('פעולה זו תמחק את כל השינויים ותחזיר את רשימת התחנות לברירת המחדל של האפליקציה. להמשיך?')) return;
        setIsLoading(true);
        try { await resetStationsInFirestore(); const defaults = await fetchDefaultIsraeliStations(); setStations(defaults); onStationsUpdate(defaults); setStatusMsg('שוחזר לברירת מחדל.'); }
        catch (e) { console.error(e); setStatusMsg('שגיאה בשחזור.'); } finally { setIsLoading(false); }
    };

    const handleStationSave = (updated: Station) => { setStations(stations.map(s => s.stationuuid === updated.stationuuid ? updated : s)); setEditingStation(null); };
    const handleDelete = (uuid: string) => { if (!confirm('למחוק את התחנה?')) return; setStations(prev => prev.filter(s => s.stationuuid !== uuid)); };
    const handleAddStation = () => {
        const newStation: Station = { stationuuid: crypto.randomUUID(), name: 'תחנה חדשה', url_resolved: '', favicon: '', tags: '', countrycode: 'IL', codec: 'MP3', bitrate: 128 };
        setStations([newStation, ...stations]); setEditingStation(newStation); setSortType('default');
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

    const handleAddAdmin = async () => {
        if (!newAdminEmail) return;
        try { await addAdmin(newAdminEmail); setAdmins([...admins, newAdminEmail]); setNewAdminEmail(''); }
        catch (e) { alert('שגיאה בהוספת מנהל'); }
    };

    const handleRemoveAdmin = async (email: string) => {
        if (!confirm(`להסיר את ${email} מניהול?`)) return;
        try { await removeAdmin(email); setAdmins(admins.filter(a => a !== email)); }
        catch (e) { alert('שגיאה בהסרת מנהל'); }
    };

    const runDiagnostics = async () => {
        setIsRunningDiagnostics(true); setDiagnosticResults([]);
        const results: DiagnosticResult[] = [];
        for (const station of stations) {
            const result: DiagnosticResult = { uuid: station.stationuuid, name: station.name, streamStatus: 'בודק...', streamType: '?', metadataStatus: 'N/A', latency: 0 };
            const start = Date.now();
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                let response = await fetch(station.url_resolved, { method: 'HEAD', mode: 'cors', signal: controller.signal }).catch(async () => {
                     return await fetch(station.url_resolved, { method: 'GET', mode: 'cors', signal: controller.signal, headers: { 'Range': 'bytes=0-100' } });
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
            } catch (e) { result.streamStatus = '❌ חסום (CORS)'; }

            let metaUrl = '';
            if (station.stationuuid.startsWith('100fm-')) { metaUrl = `https://digital.100fm.co.il/api/nowplaying/${station.stationuuid.replace('100fm-', '')}/12`; }
            else if (station.name.includes('גלגלצ')) metaUrl = 'https://glz.co.il/umbraco/api/player/UpdatePlayer?stationid=glglz';
            else if (station.name.includes('כאן')) metaUrl = 'https://www.kan.org.il/radio/live-info-v2.aspx?stationId=954';
            else if (station.name.toLowerCase().includes('eco99')) metaUrl = 'https://firestore.googleapis.com/v1/projects/eco-99-production/databases/(default)/documents/streamed_content/program';

            if (metaUrl) {
                try {
                    const controller = new AbortController(); setTimeout(() => controller.abort(), 3000);
                    const res = await fetch(metaUrl, { mode: 'cors', signal: controller.signal });
                    if (res.ok) result.metadataStatus = '✅ תקין (ישיר)';
                    else result.metadataStatus = `⚠️ שגיאה ${res.status}`;
                } catch (e) { result.metadataStatus = '❌ חסום (CORS)'; }
            }
            results.push(result); setDiagnosticResults([...results]);
        }
        setIsRunningDiagnostics(false);
    };

    const getSortedStations = () => {
        const list = [...stations];
        switch (sortType) {
            case 'name_asc': return list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
            case 'name_desc': return list.sort((a, b) => b.name.localeCompare(a.name, 'he'));
            case 'favorites': return list.sort((a, b) => (favorites.includes(b.stationuuid) ? 1 : 0) - (favorites.includes(a.stationuuid) ? 1 : 0));
            default: return list;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-bg-primary z-50 flex flex-col animate-fade-in-up overflow-hidden">
            {editingStation && <EditStationModal station={editingStation} onSave={handleStationSave} onCancel={() => setEditingStation(null)} />}
            <div className="flex items-center justify-between p-4 bg-bg-secondary shadow-md shrink-0">
                <h2 className="text-xl font-bold text-accent">פאנל ניהול</h2>
                <button onClick={onClose} className="p-2"><ChevronDownIcon className="w-6 h-6 rotate-180" /></button>
            </div>
            <div className="flex bg-bg-secondary/50 p-2 gap-2 shrink-0">
                {(['stations', 'admins', 'diagnostics'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded text-sm font-bold ${activeTab === tab ? 'bg-accent text-white' : 'hover:bg-gray-700'}`}>
                        {tab === 'stations' ? `תחנות (${stations.length})` : tab === 'admins' ? 'מנהלים' : '🩺 דיאגנוסטיקה'}
                    </button>
                ))}
            </div>
            <div className="flex-grow overflow-y-auto p-4">
                {activeTab === 'stations' && (
                    <>
                        <div className="flex flex-wrap gap-2 mb-4 sticky top-0 bg-bg-primary py-2 z-10 border-b border-gray-800 items-center">
                             <button onClick={handleSaveToCloud} disabled={isLoading} className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded font-bold shadow-lg text-sm flex-grow sm:flex-grow-0">{isLoading ? 'שומר...' : 'שמור לענן'}</button>
                             <button onClick={handleAddStation} className="bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded shadow-lg text-sm flex-grow sm:flex-grow-0">+ הוסף</button>
                             <select value={sortType} onChange={(e) => setSortType(e.target.value as AdminSortType)} className="bg-gray-700 text-white text-xs p-2 rounded border border-gray-600 outline-none flex-grow sm:flex-grow-0">
                                <option value="default">סדר שמור (ברירת מחדל)</option>
                                <option value="name_asc">שם (א-ת)</option>
                                <option value="name_desc">שם (ת-א)</option>
                                <option value="favorites">המועדפים שלי תחילה</option>
                             </select>
                             <button onClick={handleResetToDefaults} disabled={isLoading} className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px] ml-auto">איפוס</button>
                        </div>
                        {statusMsg && <div className="p-2 mb-2 bg-blue-600 text-white text-center rounded animate-pulse">{statusMsg}</div>}
                        <AdminStationList stations={getSortedStations()} sortType={sortType} onEdit={setEditingStation} onDelete={handleDelete} onMove={moveStation} />
                    </>
                )}
                {activeTab === 'admins' && <AdminAdminsTab admins={admins} newAdminEmail={newAdminEmail} onNewAdminEmailChange={setNewAdminEmail} onAddAdmin={handleAddAdmin} onRemoveAdmin={handleRemoveAdmin} currentUserEmail={currentUserEmail} />}
                {activeTab === 'diagnostics' && <AdminDiagnosticsTab isRunningDiagnostics={isRunningDiagnostics} onRunDiagnostics={runDiagnostics} diagnosticResults={diagnosticResults} />}
            </div>
        </div>
    );
};

export default AdminPanel;
