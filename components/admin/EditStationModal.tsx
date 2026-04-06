import React, { useState } from 'react';
import { Station } from '../../types';

interface EditStationModalProps {
    station: Station;
    onSave: (updated: Station) => void;
    onCancel: () => void;
}

const EditStationModal: React.FC<EditStationModalProps> = ({ station, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Station>({ ...station });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'bitrate' ? parseInt(value) || 0 : value
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-bg-secondary p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">עריכת תחנה</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-text-secondary mb-1">שם התחנה</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 rounded bg-bg-primary border border-gray-700" />
                    </div>
                    <div>
                        <label className="block text-xs text-text-secondary mb-1">URL לשידור (Stream)</label>
                        <input name="url_resolved" value={formData.url_resolved} onChange={handleChange} className="w-full p-2 rounded bg-bg-primary border border-gray-700 text-left text-xs" dir="ltr" />
                    </div>
                    <div>
                        <label className="block text-xs text-text-secondary mb-1">לוגו (URL)</label>
                        <div className="flex gap-2">
                             <input name="favicon" value={formData.favicon} onChange={handleChange} className="w-full p-2 rounded bg-bg-primary border border-gray-700 text-left text-xs" dir="ltr" />
                             <img src={formData.favicon} alt="preview" className="w-8 h-8 rounded bg-gray-700 object-cover" onError={e => (e.target as HTMLImageElement).src=''} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-text-secondary mb-1">תגיות</label>
                        <input name="tags" value={formData.tags} onChange={handleChange} className="w-full p-2 rounded bg-bg-primary border border-gray-700" />
                    </div>
                     <div>
                        <label className="block text-xs text-text-secondary mb-1">UUID (מזהה ייחודי)</label>
                        <input name="stationuuid" value={formData.stationuuid} disabled className="w-full p-2 rounded bg-bg-primary border border-gray-700 opacity-50 cursor-not-allowed text-xs" />
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500">ביטול</button>
                    <button onClick={() => onSave(formData)} className="flex-1 py-2 bg-accent text-white rounded hover:bg-accent-hover">שמור</button>
                </div>
            </div>
        </div>
    );
};

export default EditStationModal;
