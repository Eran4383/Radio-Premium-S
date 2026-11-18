import React, { useState } from 'react';
import { Station } from '../../types';
import { getStationHttpsIssues, testStreamUrl, testImageUrl } from '../../services/stationAdminUtils';
import { useAdminAudioPreview } from '../../hooks/useAdminAudioPreview';
import ImagePreviewModal from './ImagePreviewModal';

interface EditStationModalProps {
  station: Station;
  onSave: (updated: Station) => void;
  onCancel: () => void;
}

interface TestFeedback {
  status: 'idle' | 'testing' | 'ok' | 'error';
  message: string;
}

const EditStationModal: React.FC<EditStationModalProps> = ({ station, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Station>({
    ...station,
    aliases: station.aliases ? [...station.aliases] : [],
  });
  const [newAliasDraft, setNewAliasDraft] = useState('');
  const [streamTest, setStreamTest] = useState<TestFeedback>({ status: 'idle', message: '' });
  const [faviconTest, setFaviconTest] = useState<TestFeedback>({ status: 'idle', message: '' });
  const [copiedField, setCopiedField] = useState<'stream' | 'favicon' | null>(null);
  const [isImageBubbleOpen, setIsImageBubbleOpen] = useState(false);

  const {
    playingKey,
    isLoading: isAudioLoading,
    error: audioPreviewError,
    setError: setAudioPreviewError,
    togglePlay,
    stop: stopAudioPreview,
  } = useAdminAudioPreview();

  const httpsIssues = getStationHttpsIssues(formData);
  const trimmedStream = formData.url_resolved.trim();
  const httpsStreamCandidate = httpsIssues.streamIsHttp
    ? trimmedStream.replace(/^http:\/\//i, 'https://')
    : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'bitrate' ? parseInt(value, 10) || 0 : value,
    }));
    if (name === 'url_resolved') {
      setStreamTest({ status: 'idle', message: '' });
      setAudioPreviewError(null);
      stopAudioPreview();
    }
    if (name === 'favicon') setFaviconTest({ status: 'idle', message: '' });
  };

  const handleAddAlias = () => {
    const trimmed = newAliasDraft.trim();
    if (!trimmed) return;
    const current = formData.aliases || [];
    const exists =
      trimmed.toLowerCase() === formData.name.trim().toLowerCase() ||
      current.some(a => a.trim().toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setFormData(prev => ({
        ...prev,
        aliases: [...(prev.aliases || []), trimmed],
      }));
    }
    setNewAliasDraft('');
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      aliases: (prev.aliases || []).filter(a => a !== aliasToRemove),
    }));
  };

  const handleCopy = async (text: string, field: 'stream' | 'favicon') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(prev => (prev === field ? null : prev)), 1800);
    } catch {}
  };

  const handleTestStream = async (urlToTest = formData.url_resolved) => {
    setStreamTest({ status: 'testing', message: 'בודק חיבור לשידור...' });
    const res = await testStreamUrl(urlToTest);
    setStreamTest({
      status: res.ok ? 'ok' : 'error',
      message: res.ok ? `✅ ${res.message} (${res.latencyMs}ms)` : `❌ ${res.message}`,
    });
    return res.ok;
  };

  const handleTryUpgradeStreamHttps = async () => {
    if (!httpsIssues.streamIsHttp) return;
    setStreamTest({ status: 'testing', message: 'בודק אם השרת תומך ב-HTTPS...' });
    const res = await testStreamUrl(httpsStreamCandidate);
    if (res.ok) {
      stopAudioPreview();
      setFormData(prev => ({ ...prev, url_resolved: httpsStreamCandidate }));
      setStreamTest({
        status: 'ok',
        message: `✅ השרת תומך ב-HTTPS! הכתובת שודרגה אוטומטית (${res.latencyMs}ms)`,
      });
    } else {
      setStreamTest({
        status: 'error',
        message: '⚠️ השרת אינו תומך ב-HTTPS — הכתובת נשארה כ-HTTP כדי לא לשבור את השידור.',
      });
    }
  };

  const handleTestFavicon = async (urlToTest = formData.favicon) => {
    setFaviconTest({ status: 'testing', message: 'בודק טעינת לוגו...' });
    const res = await testImageUrl(urlToTest);
    setFaviconTest({
      status: res.ok ? 'ok' : 'error',
      message: res.ok ? `✅ ${res.message}` : `❌ ${res.message}`,
    });
    return res.ok;
  };

  const handleTryUpgradeFaviconHttps = async () => {
    const trimmed = formData.favicon.trim();
    if (!trimmed.toLowerCase().startsWith('http://')) return;
    const httpsUrl = trimmed.replace(/^http:\/\//i, 'https://');
    setFaviconTest({ status: 'testing', message: 'בודק אם הלוגו זמין ב-HTTPS...' });
    const res = await testImageUrl(httpsUrl);
    if (res.ok) {
      setFormData(prev => ({ ...prev, favicon: httpsUrl }));
      setFaviconTest({
        status: 'ok',
        message: `✅ הלוגו זמין ב-HTTPS ושודרג (${res.width}x${res.height})`,
      });
    } else {
      setFaviconTest({
        status: 'error',
        message: '⚠️ הלוגו לא נטען ב-HTTPS — הכתובת לא שונתה.',
      });
    }
  };

  const handleSaveClick = () => {
    stopAudioPreview();
    const cleanedAliases = (formData.aliases || []).map(a => a.trim()).filter(Boolean);
    const { aliases: _removed, ...rest } = formData;
    onSave(cleanedAliases.length > 0 ? { ...rest, aliases: cleanedAliases } : rest);
  };

  const handleCancelClick = () => {
    stopAudioPreview();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-3 sm:p-4">
      <ImagePreviewModal
        isOpen={isImageBubbleOpen}
        imageUrl={formData.favicon}
        title={formData.name || 'לוגו תחנה'}
        onClose={() => setIsImageBubbleOpen(false)}
      />

      <div className="bg-bg-secondary p-4 sm:p-6 rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-xl font-bold text-text-primary">עריכת תחנה</h3>
          {httpsIssues.hasHttpsIssue && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ⚠️ דורש בדיקת HTTPS
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">שם התחנה</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2.5 rounded-lg bg-bg-primary border border-gray-700 text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          {/* Saved Alternate Names / Aliases */}
          <div className="p-3 rounded-lg bg-bg-primary/50 border border-gray-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary">
                שמות נוספים / כינויים מוכרים (לזיהוי כפילויות ומידע)
              </label>
            </div>
            {formData.aliases && formData.aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.aliases.map(alias => (
                  <span
                    key={alias}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-sky-500/15 text-sky-200 border border-sky-500/30"
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(alias)}
                      className="text-sky-300 hover:text-red-300 font-bold"
                      aria-label={`הסר כינוי ${alias}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newAliasDraft}
                onChange={e => setNewAliasDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAlias();
                  }
                }}
                placeholder="הוסף שם נוסף לתחנה (לדוגמה: גלגלצ HD)..."
                className="flex-1 px-2.5 py-1.5 rounded bg-bg-primary border border-gray-700 text-xs text-text-primary focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={handleAddAlias}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              >
                + הוסף
              </button>
            </div>
          </div>

          {/* Stream URL Section */}
          <div className="p-3 rounded-lg bg-bg-primary/60 border border-gray-700/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-text-secondary">URL לשידור (Stream)</label>
              {httpsIssues.streamIsHttp ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ⚠️ כתובת HTTP לא מאובטחת
                </span>
              ) : trimmedStream.toLowerCase().startsWith('https://') ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🔒 HTTPS מאובטח
                </span>
              ) : null}
            </div>

            <textarea
              name="url_resolved"
              rows={2}
              value={formData.url_resolved}
              onChange={handleChange}
              className="w-full p-2.5 rounded bg-bg-primary border border-gray-700 text-left text-xs font-mono break-all resize-y focus:outline-none focus:border-accent"
              dir="ltr"
              placeholder="https://..."
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleTestStream()}
                disabled={streamTest.status === 'testing'}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
              >
                {streamTest.status === 'testing' ? 'בודק...' : '🔍 בדוק תקינות קישור'}
              </button>

              {/* Audible listen button for source URL */}
              <button
                type="button"
                onClick={() =>
                  togglePlay(
                    'source',
                    trimmedStream,
                    httpsIssues.streamIsHttp ? 'המקור (HTTP)' : formData.name
                  )
                }
                disabled={!trimmedStream}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40 ${
                  playingKey === 'source'
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-emerald-600/25 hover:bg-emerald-600/45 text-emerald-200 border border-emerald-500/40'
                }`}
              >
                {playingKey === 'source'
                  ? isAudioLoading
                    ? '⏳ טוען... (עצור)'
                    : '⏹ עצור מקור'
                  : httpsIssues.streamIsHttp
                  ? '▶ האזן למקור (HTTP)'
                  : '▶ האזן לשידור'}
              </button>

              {/* Audible listen button directly in HTTPS when current URL is HTTP */}
              {httpsIssues.streamIsHttp && (
                <button
                  type="button"
                  onClick={() => togglePlay('https', httpsStreamCandidate, 'HTTPS')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                    playingKey === 'https'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-teal-600/25 hover:bg-teal-600/45 text-teal-200 border border-teal-500/40'
                  }`}
                >
                  {playingKey === 'https'
                    ? isAudioLoading
                      ? '⏳ טוען HTTPS... (עצור)'
                      : '⏹ עצור HTTPS'
                    : '🔊 האזן ב-HTTPS'}
                </button>
              )}

              {httpsIssues.streamIsHttp && (
                <button
                  type="button"
                  onClick={handleTryUpgradeStreamHttps}
                  disabled={streamTest.status === 'testing'}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition-colors"
                >
                  🔒 בדוק ושדרג ל-HTTPS
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopy(formData.url_resolved, 'stream')}
                className="px-2.5 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                {copiedField === 'stream' ? '✓ הועתק' : '📋 העתק'}
              </button>
            </div>

            {playingKey && (
              <div className="p-2 rounded text-xs bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 flex items-center justify-between">
                <span>
                  {playingKey === 'https'
                    ? '🔊 משמיע כעת ניסיון ב-HTTPS — ודא ששומעים שידור תקין'
                    : httpsIssues.streamIsHttp
                    ? '🔊 משמיע כעת את כתובת המקור (HTTP)'
                    : '🔊 משמיע כעת את התחנה'}
                </span>
                <button
                  type="button"
                  onClick={stopAudioPreview}
                  className="text-red-300 hover:underline font-semibold"
                >
                  עצור
                </button>
              </div>
            )}

            {audioPreviewError && (
              <div className="p-2 rounded text-xs bg-red-500/15 text-red-300 border border-red-500/30">
                ❌ {audioPreviewError}
              </div>
            )}

            {streamTest.message && (
              <div
                className={`p-2 rounded text-xs ${
                  streamTest.status === 'ok'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : streamTest.status === 'error'
                    ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                    : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                }`}
              >
                {streamTest.message}
              </div>
            )}
          </div>

          {/* Favicon / Logo URL Section */}
          <div className="p-3 rounded-lg bg-bg-primary/60 border border-gray-700/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-text-secondary">לוגו (URL)</label>
              {httpsIssues.faviconIsHttp ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ⚠️ לוגו HTTP (גורם לאזהרת דפדפן)
                </span>
              ) : formData.favicon.trim().toLowerCase().startsWith('https://') ? (
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🔒 HTTPS מאובטח
                </span>
              ) : null}
            </div>

            <div className="flex gap-3 items-start">
              <textarea
                name="favicon"
                rows={2}
                value={formData.favicon}
                onChange={handleChange}
                className="flex-1 p-2.5 rounded bg-bg-primary border border-gray-700 text-left text-xs font-mono break-all resize-y focus:outline-none focus:border-accent"
                dir="ltr"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => {
                  if (formData.favicon.trim()) setIsImageBubbleOpen(true);
                }}
                disabled={!formData.favicon.trim()}
                className="relative group w-12 h-12 rounded-lg bg-black/50 border border-gray-700 hover:border-accent flex-shrink-0 overflow-hidden cursor-zoom-in disabled:cursor-default"
                title="לחץ להגדלת התמונה בחלון בועה"
                aria-label="הגדל תמונת תצוגה"
              >
                <img
                  src={formData.favicon}
                  alt="תצוגה מקדימה"
                  className="w-full h-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).src = ''; }}
                />
                {formData.favicon.trim() && (
                  <span className="absolute bottom-0.5 left-0.5 bg-black/75 text-[9px] text-white px-1 rounded opacity-80 group-hover:opacity-100">
                    🔍
                  </span>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleTestFavicon()}
                disabled={faviconTest.status === 'testing'}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
              >
                {faviconTest.status === 'testing' ? 'בודק...' : '🖼️ בדוק לוגו'}
              </button>
              {httpsIssues.faviconIsHttp && (
                <button
                  type="button"
                  onClick={handleTryUpgradeFaviconHttps}
                  disabled={faviconTest.status === 'testing'}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white transition-colors"
                >
                  🔒 בדוק ושדרג ל-HTTPS
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCopy(formData.favicon, 'favicon')}
                className="px-2.5 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
              >
                {copiedField === 'favicon' ? '✓ הועתק' : '📋 העתק'}
              </button>
            </div>

            {faviconTest.message && (
              <div
                className={`p-2 rounded text-xs ${
                  faviconTest.status === 'ok'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : faviconTest.status === 'error'
                    ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                    : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                }`}
              >
                {faviconTest.message}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-text-secondary mb-1">תגיות</label>
              <input
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full p-2 rounded bg-bg-primary border border-gray-700 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Bitrate</label>
              <input
                type="number"
                name="bitrate"
                value={formData.bitrate}
                onChange={handleChange}
                className="w-full p-2 rounded bg-bg-primary border border-gray-700 text-sm text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">UUID (מזהה ייחודי)</label>
            <input
              name="stationuuid"
              value={formData.stationuuid}
              disabled
              className="w-full p-2 rounded bg-bg-primary border border-gray-700 opacity-50 cursor-not-allowed text-xs font-mono"
              dir="ltr"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleCancelClick} className="flex-1 py-2.5 bg-gray-600 rounded-lg hover:bg-gray-500 font-medium">
            ביטול
          </button>
          <button onClick={handleSaveClick} className="flex-1 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover font-bold">
            שמור שינויים
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditStationModal;
