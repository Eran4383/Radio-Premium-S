import React from 'react';
import { DimLevel, DimWakeMode } from '../types/settings';

interface DimOverlayProps {
  isDimmed: boolean;
  isPreviewing: boolean;
  isSliderPreviewing: boolean;
  dimLevel: DimLevel;
  dimOpacity: number;
  dimWakeMode: DimWakeMode;
  onWake: () => void;
  onStopPreview: () => void;
}

const BLACK_OPACITY_CLASSES: Record<number, string> = {
  15: 'bg-black/[0.15]', 16: 'bg-black/[0.16]', 17: 'bg-black/[0.17]', 18: 'bg-black/[0.18]', 19: 'bg-black/[0.19]',
  20: 'bg-black/[0.20]', 21: 'bg-black/[0.21]', 22: 'bg-black/[0.22]', 23: 'bg-black/[0.23]', 24: 'bg-black/[0.24]',
  25: 'bg-black/[0.25]', 26: 'bg-black/[0.26]', 27: 'bg-black/[0.27]', 28: 'bg-black/[0.28]', 29: 'bg-black/[0.29]',
  30: 'bg-black/[0.30]', 31: 'bg-black/[0.31]', 32: 'bg-black/[0.32]', 33: 'bg-black/[0.33]', 34: 'bg-black/[0.34]',
  35: 'bg-black/[0.35]', 36: 'bg-black/[0.36]', 37: 'bg-black/[0.37]', 38: 'bg-black/[0.38]', 39: 'bg-black/[0.39]',
  40: 'bg-black/[0.40]', 41: 'bg-black/[0.41]', 42: 'bg-black/[0.42]', 43: 'bg-black/[0.43]', 44: 'bg-black/[0.44]',
  45: 'bg-black/[0.45]', 46: 'bg-black/[0.46]', 47: 'bg-black/[0.47]', 48: 'bg-black/[0.48]', 49: 'bg-black/[0.49]',
  50: 'bg-black/[0.50]', 51: 'bg-black/[0.51]', 52: 'bg-black/[0.52]', 53: 'bg-black/[0.53]', 54: 'bg-black/[0.54]',
  55: 'bg-black/[0.55]', 56: 'bg-black/[0.56]', 57: 'bg-black/[0.57]', 58: 'bg-black/[0.58]', 59: 'bg-black/[0.59]',
  60: 'bg-black/[0.60]', 61: 'bg-black/[0.61]', 62: 'bg-black/[0.62]', 63: 'bg-black/[0.63]', 64: 'bg-black/[0.64]',
  65: 'bg-black/[0.65]', 66: 'bg-black/[0.66]', 67: 'bg-black/[0.67]', 68: 'bg-black/[0.68]', 69: 'bg-black/[0.69]',
  70: 'bg-black/[0.70]', 71: 'bg-black/[0.71]', 72: 'bg-black/[0.72]', 73: 'bg-black/[0.73]', 74: 'bg-black/[0.74]',
  75: 'bg-black/[0.75]', 76: 'bg-black/[0.76]', 77: 'bg-black/[0.77]', 78: 'bg-black/[0.78]', 79: 'bg-black/[0.79]',
  80: 'bg-black/[0.80]',
};

const WARM_OPACITY_CLASSES: Record<number, string> = {
  15: 'bg-[#1c0f02]/[0.15]', 16: 'bg-[#1c0f02]/[0.16]', 17: 'bg-[#1c0f02]/[0.17]', 18: 'bg-[#1c0f02]/[0.18]', 19: 'bg-[#1c0f02]/[0.19]',
  20: 'bg-[#1c0f02]/[0.20]', 21: 'bg-[#1c0f02]/[0.21]', 22: 'bg-[#1c0f02]/[0.22]', 23: 'bg-[#1c0f02]/[0.23]', 24: 'bg-[#1c0f02]/[0.24]',
  25: 'bg-[#1c0f02]/[0.25]', 26: 'bg-[#1c0f02]/[0.26]', 27: 'bg-[#1c0f02]/[0.27]', 28: 'bg-[#1c0f02]/[0.28]', 29: 'bg-[#1c0f02]/[0.29]',
  30: 'bg-[#1c0f02]/[0.30]', 31: 'bg-[#1c0f02]/[0.31]', 32: 'bg-[#1c0f02]/[0.32]', 33: 'bg-[#1c0f02]/[0.33]', 34: 'bg-[#1c0f02]/[0.34]',
  35: 'bg-[#1c0f02]/[0.35]', 36: 'bg-[#1c0f02]/[0.36]', 37: 'bg-[#1c0f02]/[0.37]', 38: 'bg-[#1c0f02]/[0.38]', 39: 'bg-[#1c0f02]/[0.39]',
  40: 'bg-[#1c0f02]/[0.40]', 41: 'bg-[#1c0f02]/[0.41]', 42: 'bg-[#1c0f02]/[0.42]', 43: 'bg-[#1c0f02]/[0.43]', 44: 'bg-[#1c0f02]/[0.44]',
  45: 'bg-[#1c0f02]/[0.45]', 46: 'bg-[#1c0f02]/[0.46]', 47: 'bg-[#1c0f02]/[0.47]', 48: 'bg-[#1c0f02]/[0.48]', 49: 'bg-[#1c0f02]/[0.49]',
  50: 'bg-[#1c0f02]/[0.50]', 51: 'bg-[#1c0f02]/[0.51]', 52: 'bg-[#1c0f02]/[0.52]', 53: 'bg-[#1c0f02]/[0.53]', 54: 'bg-[#1c0f02]/[0.54]',
  55: 'bg-[#1c0f02]/[0.55]', 56: 'bg-[#1c0f02]/[0.56]', 57: 'bg-[#1c0f02]/[0.57]', 58: 'bg-[#1c0f02]/[0.58]', 59: 'bg-[#1c0f02]/[0.59]',
  60: 'bg-[#1c0f02]/[0.60]', 61: 'bg-[#1c0f02]/[0.61]', 62: 'bg-[#1c0f02]/[0.62]', 63: 'bg-[#1c0f02]/[0.63]', 64: 'bg-[#1c0f02]/[0.64]',
  65: 'bg-[#1c0f02]/[0.65]', 66: 'bg-[#1c0f02]/[0.66]', 67: 'bg-[#1c0f02]/[0.67]', 68: 'bg-[#1c0f02]/[0.68]', 69: 'bg-[#1c0f02]/[0.69]',
  70: 'bg-[#1c0f02]/[0.70]', 71: 'bg-[#1c0f02]/[0.71]', 72: 'bg-[#1c0f02]/[0.72]', 73: 'bg-[#1c0f02]/[0.73]', 74: 'bg-[#1c0f02]/[0.74]',
  75: 'bg-[#1c0f02]/[0.75]', 76: 'bg-[#1c0f02]/[0.76]', 77: 'bg-[#1c0f02]/[0.77]', 78: 'bg-[#1c0f02]/[0.78]', 79: 'bg-[#1c0f02]/[0.79]',
  80: 'bg-[#1c0f02]/[0.80]',
};

const getOverlayBgClass = (dimLevel: DimLevel, dimOpacity: number): string => {
  const clamped = Math.min(80, Math.max(15, Math.round(dimOpacity)));
  if (dimLevel === 'warm') {
    return WARM_OPACITY_CLASSES[clamped] || 'bg-[#1c0f02]/[0.65]';
  }
  return BLACK_OPACITY_CLASSES[clamped] || 'bg-black/[0.55]';
};

const DimOverlay: React.FC<DimOverlayProps> = ({
  isDimmed,
  isPreviewing,
  isSliderPreviewing,
  dimLevel,
  dimOpacity,
  dimWakeMode,
  onWake,
  onStopPreview,
}) => {
  const isAnyPreview = isPreviewing || isSliderPreviewing;
  const isVisible = isDimmed || isAnyPreview;
  // Block full-screen taps ONLY during natural doubleTap dim — never during live preview,
  // so the user can drag the slider and toggle presets underneath in real time.
  const isBlockingBackdropTap = !isAnyPreview && isDimmed && dimWakeMode === 'doubleTap';

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isBlockingBackdropTap) return;
    e.preventDefault();
    e.stopPropagation();
    onWake();
  };

  return (
    <div
      onClick={handleBackdropClick}
      aria-hidden={!isBlockingBackdropTap}
      className={`fixed inset-0 z-[70] flex items-end justify-start p-6 transition-all ${
        getOverlayBgClass(dimLevel, dimOpacity)
      } ${
        isVisible
          ? `opacity-100 ${isAnyPreview ? 'duration-75' : 'duration-700'} ${isBlockingBackdropTap ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`
          : 'opacity-0 duration-150 pointer-events-none'
      }`}
    >
      {isBlockingBackdropTap && (
        <div className="mx-auto px-4 py-1.5 rounded-full bg-black/70 border border-white/15 text-white/85 text-xs select-none pointer-events-none">
          הקש פעם אחת להארת המסך
        </div>
      )}

      {isPreviewing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStopPreview();
          }}
          className="pointer-events-auto px-4 py-2 rounded-full bg-black/80 hover:bg-black text-white text-xs font-medium border border-white/25 shadow-lg transition-colors"
        >
          תצוגה מקדימה ({dimOpacity}%) • לחץ לסגירה
        </button>
      )}

      {!isPreviewing && isSliderPreviewing && (
        <div className="px-4 py-2 rounded-full bg-black/75 text-white/90 text-xs font-medium border border-white/20 shadow-lg select-none pointer-events-none">
          התאמה בזמן אמת ({dimOpacity}%)
        </div>
      )}
    </div>
  );
};

export default DimOverlay;
