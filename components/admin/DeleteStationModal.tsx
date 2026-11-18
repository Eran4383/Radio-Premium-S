import React, { useEffect, useState } from 'react';
import { Station } from '../../types';
import { getStationHttpsIssues } from '../../services/stationAdminUtils';

interface DeleteStationModalProps {
  station: Station | null;
  failedHttpsTest?: boolean;
  onConfirmDelete: (station: Station, archiveNonHttps: boolean, reason: string) => void;
  onCancel: () => void;
}

const DeleteStationModal: React.FC<DeleteStationModalProps> = ({
  station,
  failedHttpsTest,
  onConfirmDelete,
  onCancel,
}) => {
  const [archiveNonHttps, setArchiveNonHttps] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!station) return;
    const issues = getStationHttpsIssues(station);
    const shouldSuggestArchive = Boolean(failedHttpsTest || issues.hasHttpsIssue);
    setArchiveNonHttps(shouldSuggestArchive);
    setReason(
      shouldSuggestArchive
        ? failedHttpsTest
          ? 'נמחק עקב חוסר בתמיכת HTTPS (נבדק ונכשל)'
          : 'נמחק עקב כתובת HTTP / חוסר בתמיכת HTTPS'
        : ''
    );
  }, [station, failedHttpsTest]);

  if (!station) return null;

  const issues = getStationHttpsIssues(station);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="bg-bg-secondary border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {station.favicon && (
            <img
              src={station.favicon}
              alt={station.name}
              className="w-11 h-11 rounded-lg bg-black object-contain border border-gray-700 flex-shrink-0"
              onError={e => { (e.target as HTMLImageElement).src = ''; }}
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text-primary">מחיקת תחנה</h3>
            <p className="text-sm text-text-secondary truncate">
              האם למחוק את <strong className="text-text-primary">{station.name}</strong>?
            </p>
          </div>
        </div>

        {issues.hasHttpsIssue && (
          <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200">
            ⚠️ לתחנה זו יש כתובת HTTP לא מאובטחת ({issues.streamIsHttp ? 'שידור' : ''}{issues.streamIsHttp && issues.faviconIsHttp ? ' + ' : ''}{issues.faviconIsHttp ? 'לוגו' : ''}).
          </div>
        )}

        <div className="p-3 rounded-xl bg-bg-primary/70 border border-gray-700/80 space-y-2.5">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={archiveNonHttps}
              onChange={e => {
                const checked = e.target.checked;
                setArchiveNonHttps(checked);
                if (checked && !reason.trim()) {
                  setReason('נמחק עקב חוסר בתמיכת HTTPS');
                }
              }}
              className="mt-0.5 accent-accent w-4 h-4 rounded"
            />
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-text-primary">
                📦 שמור במעקב &quot;תחנות שנמחקו עקב חוסר ב-HTTPS&quot;
              </div>
              <div className="text-[11px] text-text-secondary leading-relaxed">
                הפרטים המלאים יישמרו בארכיון ייעודי כדי שתוכל לבדוק בעתיד אם השרת עבר ל-HTTPS ולהוסיף מחדש בלחיצה אחת.
              </div>
            </div>
          </label>

          {archiveNonHttps && (
            <div>
              <label className="block text-[11px] text-text-secondary mb-1">סיבה / הערה למעקב עתידי</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="לדוגמה: נמחק כי אין HTTPS בזרם, לבדוק שוב בעוד חודש..."
                className="w-full px-2.5 py-1.5 rounded bg-bg-secondary border border-gray-700 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium text-white transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={() => onConfirmDelete(station, archiveNonHttps, reason.trim() || 'נמחק עקב חוסר בתמיכת HTTPS')}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-bold text-white transition-colors"
          >
            {archiveNonHttps ? 'מחק ושמור למעקב' : 'מחק תחנה'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteStationModal;
