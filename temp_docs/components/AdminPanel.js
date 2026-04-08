import React, { useState, useEffect } from 'react';
import { fetchDefaultIsraeliStations } from '../services/radioService';
import { saveCustomStations, resetStationsInFirestore, fetchAdmins, addAdmin, removeAdmin } from '../services/settingsService';
import { ChevronDownIcon } from './Icons';
import EditStationModal from './admin/EditStationModal';
import AdminStationList from './admin/AdminStationList';
import AdminAdminsTab from './admin/AdminAdminsTab';
import AdminDiagnosticsTab from './admin/AdminDiagnosticsTab';
import { LogPanel } from './admin/LogPanel';
const AdminPanel = ({ isOpen, onClose, currentStations, onStationsUpdate, currentUserEmail, favorites }) => {
    const [stations, setStations] = useState(currentStations);
    const [editingStation, setEditingStation] = useState(null);
    const [activeTab, setActiveTab] = useState('stations');
    const [admins, setAdmins] = useState([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sortType, setSortType] = useState('default');
    const [diagnosticResults, setDiagnosticResults] = useState([]);
    const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
    useEffect(() => { if (isOpen) {
        setStations(currentStations);
        fetchAdmins().then(setAdmins);
    } }, [isOpen, currentStations]);
    const handleSaveToCloud = async () => {
        setIsLoading(true);
        try {
            await saveCustomStations(stations);
            onStationsUpdate(stations);
            setStatusMsg('נשמר בהצלחה בענן!');
            setTimeout(() => setStatusMsg(''), 3000);
        }
        catch (e) {
            console.error(e);
            setStatusMsg('שגיאה בשמירה.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleResetToDefaults = async () => {
        if (!confirm('פעולה זו תמחק את כל השינויים ותחזיר את רשימת התחנות לברירת המחדל של האפליקציה. להמשיך?'))
            return;
        setIsLoading(true);
        try {
            await resetStationsInFirestore();
            const defaults = await fetchDefaultIsraeliStations();
            setStations(defaults);
            onStationsUpdate(defaults);
            setStatusMsg('שוחזר לברירת מחדל.');
        }
        catch (e) {
            console.error(e);
            setStatusMsg('שגיאה בשחזור.');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleStationSave = (updated) => { setStations(stations.map(s => s.stationuuid === updated.stationuuid ? updated : s)); setEditingStation(null); };
    const handleDelete = (uuid) => { if (!confirm('למחוק את התחנה?'))
        return; setStations(prev => prev.filter(s => s.stationuuid !== uuid)); };
    const handleAddStation = () => {
        const newStation = { stationuuid: crypto.randomUUID(), name: 'תחנה חדשה', url_resolved: '', favicon: '', tags: '', countrycode: 'IL', codec: 'MP3', bitrate: 128 };
        setStations([newStation, ...stations]);
        setEditingStation(newStation);
        setSortType('default');
    };
    const moveStation = (uuid, direction) => {
        const index = stations.findIndex(s => s.stationuuid === uuid);
        if (index === -1)
            return;
        const newStations = [...stations];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newStations.length)
            return;
        [newStations[index], newStations[targetIndex]] = [newStations[targetIndex], newStations[index]];
        setStations(newStations);
    };
    const handleAddAdmin = async () => {
        if (!newAdminEmail)
            return;
        try {
            await addAdmin(newAdminEmail);
            setAdmins([...admins, newAdminEmail]);
            setNewAdminEmail('');
        }
        catch (e) {
            alert('שגיאה בהוספת מנהל');
        }
    };
    const handleRemoveAdmin = async (email) => {
        if (!confirm(`להסיר את ${email} מניהול?`))
            return;
        try {
            await removeAdmin(email);
            setAdmins(admins.filter(a => a !== email));
        }
        catch (e) {
            alert('שגיאה בהסרת מנהל');
        }
    };
    const runDiagnostics = async () => {
        setIsRunningDiagnostics(true);
        setDiagnosticResults([]);
        const results = [];
        for (const station of stations) {
            const result = { uuid: station.stationuuid, name: station.name, streamStatus: 'בודק...', streamType: '?', metadataStatus: 'N/A', latency: 0 };
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
                    if (type?.includes('mpegurl') || station.url_resolved.includes('.m3u8'))
                        result.streamType = 'HLS (m3u8)';
                    else if (type?.includes('mpeg') || type?.includes('audio'))
                        result.streamType = 'MP3/AAC';
                    else
                        result.streamType = 'Unknown';
                }
                else
                    result.streamStatus = `⚠️ שגיאה ${response.status}`;
            }
            catch (e) {
                result.streamStatus = '❌ חסום (CORS)';
            }
            let metaUrl = '';
            if (station.stationuuid.startsWith('100fm-')) {
                metaUrl = `https://digital.100fm.co.il/api/nowplaying/${station.stationuuid.replace('100fm-', '')}/12`;
            }
            else if (station.name.includes('גלגלצ'))
                metaUrl = 'https://glz.co.il/umbraco/api/player/UpdatePlayer?stationid=glglz';
            else if (station.name.includes('כאן'))
                metaUrl = 'https://www.kan.org.il/radio/live-info-v2.aspx?stationId=954';
            else if (station.name.toLowerCase().includes('eco99'))
                metaUrl = 'https://firestore.googleapis.com/v1/projects/eco-99-production/databases/(default)/documents/streamed_content/program';
            if (metaUrl) {
                try {
                    const controller = new AbortController();
                    setTimeout(() => controller.abort(), 3000);
                    const res = await fetch(metaUrl, { mode: 'cors', signal: controller.signal });
                    if (res.ok)
                        result.metadataStatus = '✅ תקין (ישיר)';
                    else
                        result.metadataStatus = `⚠️ שגיאה ${res.status}`;
                }
                catch (e) {
                    result.metadataStatus = '❌ חסום (CORS)';
                }
            }
            results.push(result);
            setDiagnosticResults([...results]);
        }
        setIsRunningDiagnostics(false);
    };
    const handleDownloadCSV = () => {
        const headers = ['Name', 'Stream URL', 'Codec', 'Bitrate', 'Tags', 'UUID'];
        const rows = stations.map(s => [
            `"${s.name.replace(/"/g, '""')}"`,
            `"${s.url_resolved}"`,
            s.codec,
            s.bitrate,
            `"${s.tags.replace(/"/g, '""')}"`,
            s.stationuuid
        ]);
        const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `radio_stations_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const handleUploadCSV = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result;
                const lines = text.split(/\r?\n/);
                if (lines.length < 2)
                    throw new Error('קובץ ריק או לא תקין');
                // Simple CSV parser that handles quotes
                const parseCSVLine = (line) => {
                    const result = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                                current += '"';
                                i++;
                            }
                            else {
                                inQuotes = !inQuotes;
                            }
                        }
                        else if (char === ',' && !inQuotes) {
                            result.push(current);
                            current = '';
                        }
                        else {
                            current += char;
                        }
                    }
                    result.push(current);
                    return result;
                };
                const newStations = [];
                // Skip header
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line)
                        continue;
                    const parts = parseCSVLine(line);
                    if (parts.length < 2)
                        continue;
                    const [name, url, codec, bitrate, tags, uuid] = parts;
                    newStations.push({
                        name: name || 'ללא שם',
                        url_resolved: url || '',
                        favicon: '', // Added missing property
                        codec: codec || 'MP3',
                        bitrate: parseInt(bitrate) || 128,
                        tags: tags || '',
                        stationuuid: uuid || crypto.randomUUID(),
                        countrycode: 'IL'
                    });
                }
                if (newStations.length > 0) {
                    if (confirm(`האם לעדכן את רשימת התחנות ב-${newStations.length} תחנות מהקובץ? (זה יחליף את הרשימה הנוכחית)`)) {
                        setStations(newStations);
                        setStatusMsg(`נטענו ${newStations.length} תחנות בהצלחה. אל תשכח לשמור לענן!`);
                    }
                }
            }
            catch (err) {
                console.error(err);
                alert('שגיאה בקריאת הקובץ. וודא שהפורמט תקין.');
            }
            // Reset input
            e.target.value = '';
        };
        reader.readAsText(file);
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
    if (!isOpen)
        return null;
    return (React.createElement("div", { className: "fixed inset-0 bg-bg-primary z-50 flex flex-col animate-fade-in-up overflow-hidden" },
        editingStation && React.createElement(EditStationModal, { station: editingStation, onSave: handleStationSave, onCancel: () => setEditingStation(null) }),
        React.createElement("div", { className: "flex items-center justify-between p-4 bg-bg-secondary shadow-md shrink-0" },
            React.createElement("h2", { className: "text-xl font-bold text-accent" }, "\u05E4\u05D0\u05E0\u05DC \u05E0\u05D9\u05D4\u05D5\u05DC"),
            React.createElement("button", { onClick: onClose, className: "p-2" },
                React.createElement(ChevronDownIcon, { className: "w-6 h-6 rotate-180" }))),
        React.createElement("div", { className: "flex bg-bg-secondary/50 p-2 gap-2 shrink-0" }, ['stations', 'admins', 'diagnostics', 'logs'].map(tab => (React.createElement("button", { key: tab, onClick: () => setActiveTab(tab), className: `flex-1 py-2 rounded text-sm font-bold ${activeTab === tab ? 'bg-accent text-white' : 'hover:bg-gray-700'}` }, tab === 'stations' ? `תחנות (${stations.length})` : tab === 'admins' ? 'מנהלים' : tab === 'diagnostics' ? '🩺 דיאגנוסטיקה' : '📋 לוגים')))),
        React.createElement("div", { className: "flex-grow overflow-y-auto p-4" },
            activeTab === 'stations' && (React.createElement(React.Fragment, null,
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-4 sticky top-0 bg-bg-primary py-2 z-10 border-b border-gray-800 items-center" },
                    React.createElement("button", { onClick: handleSaveToCloud, disabled: isLoading, className: "bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded font-bold shadow-lg text-sm flex-grow sm:flex-grow-0" }, isLoading ? 'שומר...' : 'שמור לענן'),
                    React.createElement("button", { onClick: handleAddStation, className: "bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded shadow-lg text-sm flex-grow sm:flex-grow-0" }, "+ \u05D4\u05D5\u05E1\u05E3"),
                    React.createElement("button", { onClick: handleDownloadCSV, className: "bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded shadow-lg text-sm flex-grow sm:flex-grow-0" }, "\uD83D\uDCE5 \u05D4\u05D5\u05E8\u05D3 \u05E8\u05E9\u05D9\u05DE\u05D4 (CSV)"),
                    React.createElement("label", { className: "bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded shadow-lg text-sm flex-grow sm:flex-grow-0 cursor-pointer text-center" },
                        "\uD83D\uDCE4 \u05D4\u05E2\u05DC\u05D4 \u05E8\u05E9\u05D9\u05DE\u05D4 (CSV)",
                        React.createElement("input", { type: "file", accept: ".csv", onChange: handleUploadCSV, className: "hidden" })),
                    React.createElement("select", { value: sortType, onChange: (e) => setSortType(e.target.value), className: "bg-gray-700 text-white text-xs p-2 rounded border border-gray-600 outline-none flex-grow sm:flex-grow-0" },
                        React.createElement("option", { value: "default" }, "\u05E1\u05D3\u05E8 \u05E9\u05DE\u05D5\u05E8 (\u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC)"),
                        React.createElement("option", { value: "name_asc" }, "\u05E9\u05DD (\u05D0-\u05EA)"),
                        React.createElement("option", { value: "name_desc" }, "\u05E9\u05DD (\u05EA-\u05D0)"),
                        React.createElement("option", { value: "favorites" }, "\u05D4\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05E9\u05DC\u05D9 \u05EA\u05D7\u05D9\u05DC\u05D4")),
                    React.createElement("button", { onClick: handleResetToDefaults, disabled: isLoading, className: "bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px] ml-auto" }, "\u05D0\u05D9\u05E4\u05D5\u05E1")),
                statusMsg && React.createElement("div", { className: "p-2 mb-2 bg-blue-600 text-white text-center rounded animate-pulse" }, statusMsg),
                React.createElement(AdminStationList, { stations: getSortedStations(), sortType: sortType, onEdit: setEditingStation, onDelete: handleDelete, onMove: moveStation }))),
            activeTab === 'admins' && React.createElement(AdminAdminsTab, { admins: admins, newAdminEmail: newAdminEmail, onNewAdminEmailChange: setNewAdminEmail, onAddAdmin: handleAddAdmin, onRemoveAdmin: handleRemoveAdmin, currentUserEmail: currentUserEmail }),
            activeTab === 'diagnostics' && React.createElement(AdminDiagnosticsTab, { isRunningDiagnostics: isRunningDiagnostics, onRunDiagnostics: runDiagnostics, diagnosticResults: diagnosticResults }),
            activeTab === 'logs' && React.createElement(LogPanel, null))));
};
export default AdminPanel;
