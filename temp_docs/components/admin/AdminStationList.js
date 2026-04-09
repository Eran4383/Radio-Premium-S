import React from 'react';
const AdminStationList = ({ stations, sortType, onEdit, onDelete, onMove }) => {
    return (React.createElement("div", { className: "space-y-2" }, stations.map((s) => (React.createElement("div", { key: s.stationuuid, className: "flex items-center gap-3 bg-bg-secondary p-2 rounded border border-gray-800 hover:border-accent/50 transition-colors" },
        sortType === 'default' && (React.createElement("div", { className: "flex flex-col gap-1" },
            React.createElement("button", { onClick: () => onMove(s.stationuuid, -1), disabled: stations.indexOf(s) === 0, className: "text-gray-500 hover:text-white disabled:opacity-20 text-xs" }, "\u25B2"),
            React.createElement("button", { onClick: () => onMove(s.stationuuid, 1), disabled: stations.indexOf(s) === stations.length - 1, className: "text-gray-500 hover:text-white disabled:opacity-20 text-xs" }, "\u25BC"))),
        React.createElement("img", { src: s.favicon, className: "w-10 h-10 bg-black object-contain rounded", onError: e => e.target.src = '' }),
        React.createElement("div", { className: "flex-grow min-w-0" },
            React.createElement("div", { className: "font-bold truncate text-sm" }, s.name),
            React.createElement("div", { className: "text-[10px] text-text-secondary truncate text-left", dir: "ltr" }, s.url_resolved)),
        React.createElement("button", { onClick: () => onEdit(s), className: "p-2 text-blue-400 hover:bg-blue-400/20 rounded text-xs" }, "\u05E2\u05E8\u05D5\u05DA"),
        React.createElement("button", { onClick: () => onDelete(s.stationuuid), className: "p-2 text-red-400 hover:bg-red-400/20 rounded text-xs" }, "\u05DE\u05D7\u05E7"))))));
};
export default AdminStationList;
