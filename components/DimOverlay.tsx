import React from 'react';
import { DimLevel, DimWakeMode } from '../types/settings';

interface DimOverlayProps {
  isDimmed: boolean;
  dimLevel: DimLevel;
  dimWakeMode: DimWakeMode;
  onWake: () => void;
}

const DIM_LEVEL_CLASSES: Record<DimLevel, string> = {
  light: 'bg-black/30',
  balanced: 'bg-black/55',
  deep: 'bg-black/75',
  warm: 'bg-[#1c0f02]/65',
};

const DimOverlay: React.FC<DimOverlayProps> = ({ isDimmed, dimLevel, dimWakeMode, onWake }) => {
  const isBlockingFirstTap = isDimmed && dimWakeMode === 'doubleTap';

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBlockingFirstTap) return;
    e.preventDefault();
    e.stopPropagation();
    onWake();
  };

  return (
    <div
      onClick={handleOverlayClick}
      aria-hidden={!isBlockingFirstTap}
      className={`fixed inset-0 z-[70] flex items-end justify-center pb-8 transition-opacity ${
        DIM_LEVEL_CLASSES[dimLevel]
      } ${
        isDimmed
          ? `opacity-100 duration-700 ${isBlockingFirstTap ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`
          : 'opacity-0 duration-150 pointer-events-none'
      }`}
    >
      {isBlockingFirstTap && (
        <div className="px-4 py-1.5 rounded-full bg-black/50 border border-white/10 text-white/60 text-xs select-none pointer-events-none">
          הקש פעם אחת להארת המסך
        </div>
      )}
    </div>
  );
};

export default DimOverlay;
