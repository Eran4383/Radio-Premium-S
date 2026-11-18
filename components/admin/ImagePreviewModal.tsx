import React, { useEffect, useState } from 'react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  imageUrl,
  title,
  onClose,
}) => {
  const [previewMode, setPreviewMode] = useState<'current' | 'https'>('current');
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [hasError, setHasError] = useState(false);

  const trimmed = (imageUrl || '').trim();
  const isHttp = trimmed.toLowerCase().startsWith('http://');
  const activeUrl =
    previewMode === 'https' && isHttp
      ? trimmed.replace(/^http:\/\//i, 'https://')
      : trimmed;

  useEffect(() => {
    if (isOpen) {
      setPreviewMode('current');
      setDimensions(null);
      setHasError(false);
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    setDimensions(null);
    setHasError(false);
  }, [previewMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !trimmed) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-label={title ? `תצוגה מוגדלת: ${title}` : 'תצוגה מוגדלת'}
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-gray-600/80 rounded-2xl shadow-2xl w-full max-w-sm p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-text-primary truncate">
            {title || 'תצוגת תמונה'}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        {isHttp && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-bg-primary rounded-lg border border-gray-700/60">
            <button
              type="button"
              onClick={() => setPreviewMode('current')}
              className={`py-1 px-2 text-xs rounded-md transition-colors ${
                previewMode === 'current'
                  ? 'bg-bg-secondary text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              מקור (HTTP)
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('https')}
              className={`py-1 px-2 text-xs rounded-md transition-colors ${
                previewMode === 'https'
                  ? 'bg-bg-secondary text-emerald-300 font-semibold border border-emerald-500/40'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              בדיקה ב-HTTPS
            </button>
          </div>
        )}

        <div className="bg-black/75 rounded-xl border border-gray-700/60 p-3 flex items-center justify-center min-h-[200px] max-h-[300px]">
          {hasError ? (
            <div className="text-center text-xs text-red-300 space-y-1">
              <p>❌ התמונה לא נטענה מכתובת זו</p>
              {previewMode === 'https' && (
                <p className="text-[11px] text-text-secondary">ייתכן שהשרת אינו תומך ב-HTTPS עבור התמונה.</p>
              )}
            </div>
          ) : (
            <img
              src={activeUrl}
              alt={title || 'תצוגה מוגדלת'}
              className="max-w-full max-h-[260px] object-contain rounded"
              onLoad={(e) => {
                const img = e.currentTarget;
                setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
              }}
              onError={() => setHasError(true)}
            />
          )}
        </div>

        <div className="space-y-1">
          {dimensions && (
            <div className="text-[11px] text-emerald-300 font-medium text-center">
              מידות: {dimensions.width} × {dimensions.height} פיקסלים
            </div>
          )}
          <div
            className="text-[11px] font-mono text-text-secondary break-all text-left bg-bg-primary p-2 rounded border border-gray-800 max-h-20 overflow-y-auto"
            dir="ltr"
          >
            {activeUrl}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImagePreviewModal;
