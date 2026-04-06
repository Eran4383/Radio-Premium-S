import React from 'react';

interface DiagnosticResult {
    uuid: string;
    name: string;
    streamStatus: string;
    streamType: string;
    metadataStatus: string;
    latency: number;
}

interface AdminDiagnosticsTabProps {
    isRunningDiagnostics: boolean;
    onRunDiagnostics: () => void;
    diagnosticResults: DiagnosticResult[];
}

const AdminDiagnosticsTab: React.FC<AdminDiagnosticsTabProps> = ({
    isRunningDiagnostics,
    onRunDiagnostics,
    diagnosticResults
}) => {
    return (
        <div className="space-y-4">
            <div className="bg-bg-secondary p-4 rounded-lg">
                <h3 className="font-bold mb-2">בדיקת תקינות מערכת (CORS & Streams)</h3>
                <p className="text-xs text-text-secondary mb-4">
                    כלי זה בודק אילו תחנות ניתנות לגישה ישירה (Direct Access) ללא צורך בפרוקסי,
                    ומזהה את סוג השידור לטיפול מתאים במחשב/מובייל.
                </p>
                <button 
                    onClick={onRunDiagnostics} 
                    disabled={isRunningDiagnostics}
                    className={`w-full py-3 rounded font-bold shadow-lg ${isRunningDiagnostics ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-500'} text-white transition-all`}
                >
                    {isRunningDiagnostics ? 'מבצע סריקה...' : '🚀 הרץ בדיקה מלאה'}
                </button>
            </div>

            {diagnosticResults.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right bg-bg-secondary rounded-lg overflow-hidden">
                        <thead className="bg-gray-800 text-text-secondary">
                            <tr>
                                <th className="p-2">תחנה</th>
                                <th className="p-2">חיבור שידור (Direct)</th>
                                <th className="p-2">סוג</th>
                                <th className="p-2">Metadata API</th>
                                <th className="p-2">תגובה (ms)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {diagnosticResults.map((r) => (
                                <tr key={r.uuid} className="hover:bg-gray-700/50">
                                    <td className="p-2 font-bold">{r.name}</td>
                                    <td className={`p-2 ${r.streamStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                                        {r.streamStatus}
                                    </td>
                                    <td className="p-2">{r.streamType}</td>
                                    <td className={`p-2 ${r.metadataStatus.includes('✅') ? 'text-green-400' : r.metadataStatus === 'N/A' ? 'text-gray-500' : 'text-red-400'}`}>
                                        {r.metadataStatus}
                                    </td>
                                    <td className="p-2 text-text-secondary">{r.latency}ms</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminDiagnosticsTab;
