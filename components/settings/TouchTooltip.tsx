import React, { useState, useRef, useEffect } from 'react';

interface TouchTooltipProps {
  content: string;
  children: React.ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
}

const TouchTooltip: React.FC<TouchTooltipProps> = ({
  content,
  children,
  align = 'center',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clearTimers = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutside = (e: Event) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (longPressTriggeredRef.current) return;
    clearTimers();
    hoverTimerRef.current = window.setTimeout(() => {
      setIsOpen(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    clearTimers();
    setIsOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    clearTimers();
    longPressTriggeredRef.current = false;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setIsOpen(true);
    }, 420);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearTimers();
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    // Prevent accidental button activation right after releasing a long-press
    if (longPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      longPressTriggeredRef.current = false;
    }
  };

  const alignClass =
    align === 'start'
      ? 'right-0'
      : align === 'end'
        ? 'left-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClickCapture={handleClickCapture}
    >
      {children}
      {isOpen && (
        <div
          role="tooltip"
          className={`absolute top-full mt-1.5 ${alignClass} z-50 w-52 max-w-[calc(100vw-2.5rem)] px-3 py-2 rounded-lg bg-gray-900/95 text-gray-100 text-[11px] leading-relaxed shadow-xl border border-gray-600/70 pointer-events-none animate-fade-in-up`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default TouchTooltip;
