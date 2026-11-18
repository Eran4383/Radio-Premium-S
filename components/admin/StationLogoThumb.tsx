import React, { useEffect, useState } from 'react';

interface StationLogoThumbProps {
  src?: string;
  alt: string;
  sizeClass?: string;
  onStatusChange?: (status: 'empty' | 'loading' | 'ok' | 'error') => void;
}

const StationLogoThumb: React.FC<StationLogoThumbProps> = ({
  src,
  alt,
  sizeClass = 'w-10 h-10',
  onStatusChange,
}) => {
  const trimmed = (src || '').trim();
  const [status, setStatus] = useState<'empty' | 'loading' | 'ok' | 'error'>(
    trimmed ? 'loading' : 'empty'
  );

  useEffect(() => {
    const next = trimmed ? 'loading' : 'empty';
    setStatus(next);
    onStatusChange?.(next);
  }, [trimmed]);

  return (
    <div
      className={`${sizeClass} rounded bg-black/80 flex items-center justify-center overflow-hidden flex-shrink-0`}
    >
      {trimmed && status !== 'error' ? (
        <img
          src={trimmed}
          alt={alt}
          className="w-full h-full object-contain"
          onLoad={() => {
            setStatus('ok');
            onStatusChange?.('ok');
          }}
          onError={() => {
            setStatus('error');
            onStatusChange?.('error');
          }}
        />
      ) : (
        <span className="text-sm text-gray-500 select-none" aria-hidden="true">
          📻
        </span>
      )}
    </div>
  );
};

export default StationLogoThumb;
