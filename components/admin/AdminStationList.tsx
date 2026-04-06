import React from 'react';
import { Station } from '../../types';

interface AdminStationListProps {
    stations: Station[];
    sortType: string;
    onEdit: (station: Station) => void;
    onDelete: (uuid: string) => void;
    onMove: (uuid: string, direction: -1 | 1) => void;
}

const AdminStationList: React.FC<AdminStationListProps> = ({ stations, sortType, onEdit, onDelete, onMove }) => {
    return (
        <div className="space-y-2">
            {stations.map((s) => (
                <div key={s.stationuuid} className="flex items-center gap-3 bg-bg-secondary p-2 rounded border border-gray-800 hover:border-accent/50 transition-colors">
                    {sortType === 'default' && (
                        <div className="flex flex-col gap-1">
                            <button onClick={() => onMove(s.stationuuid, -1)} disabled={stations.indexOf(s) === 0} className="text-gray-500 hover:text-white disabled:opacity-20 text-xs">▲</button>
                            <button onClick={() => onMove(s.stationuuid, 1)} disabled={stations.indexOf(s) === stations.length - 1} className="text-gray-500 hover:text-white disabled:opacity-20 text-xs">▼</button>
                        </div>
                    )}
                    <img src={s.favicon} className="w-10 h-10 bg-black object-contain rounded" onError={e => (e.target as HTMLImageElement).src=''} />
                    <div className="flex-grow min-w-0">
                        <div className="font-bold truncate text-sm">{s.name}</div>
                        <div className="text-[10px] text-text-secondary truncate text-left" dir="ltr">{s.url_resolved}</div>
                    </div>
                    <button onClick={() => onEdit(s)} className="p-2 text-blue-400 hover:bg-blue-400/20 rounded text-xs">ערוך</button>
                    <button onClick={() => onDelete(s.stationuuid)} className="p-2 text-red-400 hover:bg-red-400/20 rounded text-xs">מחק</button>
                </div>
            ))}
        </div>
    );
};

export default AdminStationList;
