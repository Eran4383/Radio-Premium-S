import React from 'react';
const AdminDiagnosticsTab = ({ isRunningDiagnostics, onRunDiagnostics, diagnosticResults }) => {
    return (React.createElement("div", { className: "space-y-4" },
        React.createElement("div", { className: "bg-bg-secondary p-4 rounded-lg" },
            React.createElement("h3", { className: "font-bold mb-2" }, "\u05D1\u05D3\u05D9\u05E7\u05EA \u05EA\u05E7\u05D9\u05E0\u05D5\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA (CORS & Streams)"),
            React.createElement("p", { className: "text-xs text-text-secondary mb-4" }, "\u05DB\u05DC\u05D9 \u05D6\u05D4 \u05D1\u05D5\u05D3\u05E7 \u05D0\u05D9\u05DC\u05D5 \u05EA\u05D7\u05E0\u05D5\u05EA \u05E0\u05D9\u05EA\u05E0\u05D5\u05EA \u05DC\u05D2\u05D9\u05E9\u05D4 \u05D9\u05E9\u05D9\u05E8\u05D4 (Direct Access) \u05DC\u05DC\u05D0 \u05E6\u05D5\u05E8\u05DA \u05D1\u05E4\u05E8\u05D5\u05E7\u05E1\u05D9, \u05D5\u05DE\u05D6\u05D4\u05D4 \u05D0\u05EA \u05E1\u05D5\u05D2 \u05D4\u05E9\u05D9\u05D3\u05D5\u05E8 \u05DC\u05D8\u05D9\u05E4\u05D5\u05DC \u05DE\u05EA\u05D0\u05D9\u05DD \u05D1\u05DE\u05D7\u05E9\u05D1/\u05DE\u05D5\u05D1\u05D9\u05D9\u05DC."),
            React.createElement("button", { onClick: onRunDiagnostics, disabled: isRunningDiagnostics, className: `w-full py-3 rounded font-bold shadow-lg ${isRunningDiagnostics ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-500'} text-white transition-all` }, isRunningDiagnostics ? 'מבצע סריקה...' : '🚀 הרץ בדיקה מלאה')),
        diagnosticResults.length > 0 && (React.createElement("div", { className: "overflow-x-auto" },
            React.createElement("table", { className: "w-full text-xs text-right bg-bg-secondary rounded-lg overflow-hidden" },
                React.createElement("thead", { className: "bg-gray-800 text-text-secondary" },
                    React.createElement("tr", null,
                        React.createElement("th", { className: "p-2" }, "\u05EA\u05D7\u05E0\u05D4"),
                        React.createElement("th", { className: "p-2" }, "\u05D7\u05D9\u05D1\u05D5\u05E8 \u05E9\u05D9\u05D3\u05D5\u05E8 (Direct)"),
                        React.createElement("th", { className: "p-2" }, "\u05E1\u05D5\u05D2"),
                        React.createElement("th", { className: "p-2" }, "Metadata API"),
                        React.createElement("th", { className: "p-2" }, "\u05EA\u05D2\u05D5\u05D1\u05D4 (ms)"))),
                React.createElement("tbody", { className: "divide-y divide-gray-700" }, diagnosticResults.map((r) => (React.createElement("tr", { key: r.uuid, className: "hover:bg-gray-700/50" },
                    React.createElement("td", { className: "p-2 font-bold" }, r.name),
                    React.createElement("td", { className: `p-2 ${r.streamStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}` }, r.streamStatus),
                    React.createElement("td", { className: "p-2" }, r.streamType),
                    React.createElement("td", { className: `p-2 ${r.metadataStatus.includes('✅') ? 'text-green-400' : r.metadataStatus === 'N/A' ? 'text-gray-500' : 'text-red-400'}` }, r.metadataStatus),
                    React.createElement("td", { className: "p-2 text-text-secondary" },
                        r.latency,
                        "ms"))))))))));
};
export default AdminDiagnosticsTab;
