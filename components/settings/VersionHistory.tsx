import React from 'react';

interface ReleaseNote {
    version: string;
    date: string;
    features: string[];
}

interface VersionHistoryProps {
    releaseNotes: ReleaseNote[];
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ releaseNotes }) => (
    <div className="mb-4 text-xs text-text-secondary">
        <h4 className="font-bold text-sm text-text-primary mb-2">היסטוריית גרסאות</h4>
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
            {releaseNotes.map(release => (
            <div key={release.version}>
                <p className="font-semibold text-text-primary">גרסה {release.version} ({release.date})</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                {release.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                ))}
                </ul>
            </div>
            ))}
        </div>
    </div>
);

export default VersionHistory;
