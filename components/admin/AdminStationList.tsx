import React, { useState } from 'react';
import { Station } from '../../types';
import { getStationHttpsIssues, testStreamUrl, testImageUrl } from '../../services/stationAdminUtils';

interface AdminStationListProps {
  stations: Station[];
  sortType: string;
  favorites: string[];
  onEdit: (station: Station) => void;
  onDelete: (uuid: string) => void;
  onMove: (uuid: string, direction: -1 | 1) => void;
}

interface RowTestState {
  loading: boolean;
  streamOk?: boolean;
  streamMsg?: string;
  faviconOk?: boolean;
  latencyMs?: number;
}

const AdminStationList: React.FC<AdminStationListProps> = ({
  stations,
  sortType,
  favorites,
  onEdit,
  onDelete,
  onMove,
}) => {
  const [testResults, setTestResults] = useState<Record<string, RowTestState>>({});

  const handleQuickTest = async (station: Station) => {
    setTestResults(prev => ({
      ...prev,
      [station.stationuuid]: { loading: true },
    }));

    const [streamRes, imageRes] = await Promise.all([
      testStreamUrl(station.url_resolved),
      testImageUrl(station.favicon),
    ]);

    setTestResults(prev => ({
      ...prev,
      [station.stationuuid]: {
        loading: false,
        streamOk: streamRes.ok,
        streamMsg: streamRes.message,
        faviconOk: imageRes.ok,
        latencyMs: streamRes.latencyMs,
      },
    }));
  };

  if (stations.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        לא נמצאו תחנות התואמות לחיפוש או לסינון.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stations.map((s, idx) => {
        const issues = getStationHttpsIssues(s);
        const test = testResults[s.stationuuid];
        const isFav = favorites.includes(s.stationuuid);

        return (
          <div
            key={s.stationuuid}
            className={`bg-bg-secondary p-3 rounded-lg border transition-colors ${
              issues.hasHttpsIssue
                ? 'border-amber-500/40 hover:border-amber-400/70'
                : 'border-gray-800 hover:border-accent/50'
            }`}
          >
            <div className="flex items-start gap-3">
              {sortType === 'default' && (
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => onMove(s.stationuuid, -1)}
                    disabled={idx === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                    aria-label="הזז למעלה"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onMove(s.stationuuid, 1)}
                    disabled={idx === stations.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-20 text-xs"
                    aria-label="הזז למטה"
                  >
                    ▼
                  </button>
                </div>
              )}

              <img
                src={s.favicon}
                alt={s.name}
                className="w-11 h-11 bg-black object-contain rounded flex-shrink-0 border border-gray-700/60"
                onError={e => { (e.target as HTMLImageElement).src = ''; }}
              />

              <div className="flex-grow min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-sm text-text-primary">{s.name}</span>
                  {isFav && <span title="במועדפים" className="text-xs">⭐</span>}
                  {issues.streamIsHttp && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚠️ שידור HTTP
                    </span>
                  )}
                  {issues.faviconIsHttp && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ⚠️ לוגו HTTP
                    </span>
                  )}
                  {issues.missingFavicon && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      חסר לוגו
                    </span>
                  )}
                </div>

                <div
                  className="text-[11px] text-text-secondary font-mono break-all line-clamp-2 text-left leading-tight"
                  dir="ltr"
                  title={s.url_resolved}
                >
                  {s.url_resolved}
                </div>

                {test && !test.loading && (
                  <div className="flex flex-wrap gap-2 pt-0.5 text-[11px]">
                    <span className={test.streamOk ? 'text-emerald-400' : 'text-red-400'}>
                      {test.streamOk ? `✅ שידור תקין (${test.latencyMs}ms)` : `❌ ${test.streamMsg}`}
                    </span>
                    <span className={test.faviconOk ? 'text-emerald-400' : 'text-amber-400'}>
                      {test.faviconOk ? '✅ לוגו תקין' : '⚠️ לוגו לא נטען'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-1 flex-shrink-0">
                <button
                  onClick={() => handleQuickTest(s)}
                  disabled={test?.loading}
                  className="px-2.5 py-1.5 text-emerald-400 hover:bg-emerald-400/15 rounded text-xs font-medium disabled:opacity-50"
                  title="בדוק תקינות שידור ולוגו"
                >
                  {test?.loading ? 'בודק...' : 'בדוק'}
                </button>
                <button
                  onClick={() => onEdit(s)}
                  className="px-2.5 py-1.5 text-blue-400 hover:bg-blue-400/15 rounded text-xs font-medium"
                >
                  ערוך
                </button>
                <button
                  onClick={() => onDelete(s.stationuuid)}
                  className="px-2.5 py-1.5 text-red-400 hover:bg-red-400/15 rounded text-xs font-medium"
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStationList;
