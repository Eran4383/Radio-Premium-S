import { useEffect, useRef, useState, useCallback } from 'react';
import { DimWakeMode } from '../types/settings';
import { useWakeLock } from './useWakeLock';

interface UseScreenProtectionProps {
  isWakeLockEnabled: boolean;
  isPixelShiftEnabled: boolean;
  autoDimSeconds: number;
  dimWakeMode: DimWakeMode;
  emergencyTimeoutMinutes: number;
  isPlayingOrLoading: boolean;
}

const PIXEL_SHIFT_OFFSETS = [
  { x: 0, y: 0 },
  { x: 2, y: 1 },
  { x: 3, y: 3 },
  { x: 1, y: 3 },
  { x: -2, y: 2 },
  { x: -3, y: 0 },
  { x: -2, y: -2 },
  { x: 0, y: -3 },
  { x: 2, y: -2 },
];

export const useScreenProtection = ({
  isWakeLockEnabled,
  isPixelShiftEnabled,
  autoDimSeconds,
  dimWakeMode,
  emergencyTimeoutMinutes,
  isPlayingOrLoading,
}: UseScreenProtectionProps) => {
  const [isDimmed, setIsDimmed] = useState(false);
  const [isEmergencyIdle, setIsEmergencyIdle] = useState(false);

  const isDimmedRef = useRef(isDimmed);
  isDimmedRef.current = isDimmed;

  const dimTimerRef = useRef<number | null>(null);
  const emergencyTimerRef = useRef<number | null>(null);
  const shiftIndexRef = useRef(0);

  // Wake Lock remains active when enabled AND not in emergency idle shutoff
  useWakeLock(isWakeLockEnabled && !isEmergencyIdle);

  // 1. Pixel Shift (GPU translate3d via CSS custom properties — zero React re-renders)
  useEffect(() => {
    const rootStyle = document.documentElement.style;

    if (!isPixelShiftEnabled) {
      rootStyle.setProperty('--pixel-shift-x', '0px');
      rootStyle.setProperty('--pixel-shift-y', '0px');
      return;
    }

    const applyNextShift = () => {
      if (document.visibilityState !== 'visible') return;
      shiftIndexRef.current = (shiftIndexRef.current + 1) % PIXEL_SHIFT_OFFSETS.length;
      const offset = PIXEL_SHIFT_OFFSETS[shiftIndexRef.current];
      rootStyle.setProperty('--pixel-shift-x', `${offset.x}px`);
      rootStyle.setProperty('--pixel-shift-y', `${offset.y}px`);
    };

    const intervalId = window.setInterval(applyNextShift, 60_000);

    return () => {
      window.clearInterval(intervalId);
      rootStyle.setProperty('--pixel-shift-x', '0px');
      rootStyle.setProperty('--pixel-shift-y', '0px');
    };
  }, [isPixelShiftEnabled]);

  // Helper to reset the auto-dim countdown
  const scheduleDimTimer = useCallback(() => {
    if (dimTimerRef.current !== null) {
      window.clearTimeout(dimTimerRef.current);
      dimTimerRef.current = null;
    }
    if (autoDimSeconds > 0) {
      dimTimerRef.current = window.setTimeout(() => {
        setIsDimmed(true);
      }, autoDimSeconds * 1000);
    }
  }, [autoDimSeconds]);

  // Helper to reset the emergency idle countdown (ONLY when NOT playing)
  const scheduleEmergencyTimer = useCallback(() => {
    if (emergencyTimerRef.current !== null) {
      window.clearTimeout(emergencyTimerRef.current);
      emergencyTimerRef.current = null;
    }
    if (!isPlayingOrLoading && emergencyTimeoutMinutes > 0) {
      emergencyTimerRef.current = window.setTimeout(() => {
        setIsEmergencyIdle(true);
      }, emergencyTimeoutMinutes * 60 * 1000);
    }
  }, [isPlayingOrLoading, emergencyTimeoutMinutes]);

  const wakeFromDim = useCallback(() => {
    setIsDimmed(false);
    setIsEmergencyIdle(false);
    scheduleDimTimer();
    scheduleEmergencyTimer();
  }, [scheduleDimTimer, scheduleEmergencyTimer]);

  // Reset emergency state immediately when playback starts/resumes
  useEffect(() => {
    if (isPlayingOrLoading || emergencyTimeoutMinutes <= 0) {
      setIsEmergencyIdle(false);
    }
    scheduleEmergencyTimer();

    return () => {
      if (emergencyTimerRef.current !== null) {
        window.clearTimeout(emergencyTimerRef.current);
        emergencyTimerRef.current = null;
      }
    };
  }, [isPlayingOrLoading, emergencyTimeoutMinutes, scheduleEmergencyTimer]);

  // Manage Auto-Dim timer when setting changes
  useEffect(() => {
    if (autoDimSeconds <= 0) {
      setIsDimmed(false);
    }
    scheduleDimTimer();

    return () => {
      if (dimTimerRef.current !== null) {
        window.clearTimeout(dimTimerRef.current);
        dimTimerRef.current = null;
      }
    };
  }, [autoDimSeconds, scheduleDimTimer]);

  // Global user activity listeners
  useEffect(() => {
    const handlePointerOrTouchActivity = () => {
      // In doubleTap mode while dimmed, DimOverlay's onClick handles waking so first tap doesn't pass through
      if (isDimmedRef.current && dimWakeMode === 'doubleTap') {
        return;
      }
      if (isDimmedRef.current) {
        setIsDimmed(false);
      }
      setIsEmergencyIdle(false);
      scheduleDimTimer();
      scheduleEmergencyTimer();
    };

    const handleKeyActivity = () => {
      if (isDimmedRef.current) {
        setIsDimmed(false);
      }
      setIsEmergencyIdle(false);
      scheduleDimTimer();
      scheduleEmergencyTimer();
    };

    window.addEventListener('pointerdown', handlePointerOrTouchActivity, { capture: true, passive: true });
    window.addEventListener('wheel', handlePointerOrTouchActivity, { capture: true, passive: true });
    window.addEventListener('keydown', handleKeyActivity, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerOrTouchActivity, { capture: true });
      window.removeEventListener('wheel', handlePointerOrTouchActivity, { capture: true });
      window.removeEventListener('keydown', handleKeyActivity, { capture: true });
    };
  }, [dimWakeMode, scheduleDimTimer, scheduleEmergencyTimer]);

  return {
    isDimmed,
    wakeFromDim,
  };
};
