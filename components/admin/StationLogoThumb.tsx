import React, { useState, useEffect } from 'react';

interface StationLogoThumbProps {
  src?: string | null;
  alt: string;
  sizeClass?: string;
}

const StationLogoThumb: React.FC<StationLogoThumbProps> = ({
  src,
  alt,
  sizeClass = 'w-10 h-10',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = src?.trim();

  if (!cleanSrc || hasError) {
    return (
      <div
        className={`${sizeClass} bg-black/80 rounded flex items-center justify-center text-gray-500 text-xs select-none`}
        aria-label={alt}
      >
        📻
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      onError={() => setHasError(true)}
      className={`${sizeClass} object-contain bg-black rounded`}
      loading="lazy"
    />
  );
};

export default StationLogoThumb;
