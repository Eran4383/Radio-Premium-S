import { useEffect, useState } from 'react';
import { DeviceMode, DetectedDeviceType } from '../types/settings';

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    mobile?: boolean;
  };
}

export const detectDeviceType = (): DetectedDeviceType => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  const nav = navigator as NavigatorWithUAData;
  const ua = nav.userAgent || '';
  const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const hasAnyCoarsePointer = window.matchMedia?.('(any-pointer: coarse)').matches ?? false;
  const hasFineHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  const maxTouchPoints = nav.maxTouchPoints ?? 0;
  const isTouchCapable = hasCoarsePointer || hasAnyCoarsePointer || maxTouchPoints > 1;

  const viewportShortSide = Math.min(window.innerWidth, window.innerHeight);
  const screenShortSide = window.screen
    ? Math.min(window.screen.width, window.screen.height)
    : viewportShortSide;
  const effectiveShortSide = Math.min(viewportShortSide, screenShortSide || viewportShortSide);

  const isIPadOS = /Macintosh/i.test(ua) && maxTouchPoints > 1;
  const isTabletUA =
    /iPad|Tablet|PlayBook|Silk/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const isMobileUA =
    nav.userAgentData?.mobile === true ||
    /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);

  // 1. Phone: mobile UA or coarse-pointer touch device with phone-sized short edge
  if ((isMobileUA && effectiveShortSide < 600) || (hasCoarsePointer && effectiveShortSide < 600)) {
    return 'mobile';
  }

  // 2. Tablet: iPadOS, tablet UA, or primary-touch device >= 600px without primary desktop fine mouse+hover
  if (
    isIPadOS ||
    isTabletUA ||
    (isTouchCapable && !hasFineHover && effectiveShortSide >= 600) ||
    (hasCoarsePointer && effectiveShortSide >= 600 && effectiveShortSide <= 1150)
  ) {
    return 'tablet';
  }

  // 3. Desktop: fine pointer + hover or non-touch wide screen
  if (hasFineHover || !isTouchCapable || window.innerWidth >= 1024) {
    return 'desktop';
  }

  // 4. Viewport width fallback
  if (effectiveShortSide < 600) return 'mobile';
  if (effectiveShortSide < 1024) return 'tablet';
  return 'desktop';
};

export const useDeviceType = (deviceMode: DeviceMode) => {
  const [detectedDevice, setDetectedDevice] = useState<DetectedDeviceType>(() => detectDeviceType());

  useEffect(() => {
    const updateDeviceType = () => {
      setDetectedDevice(detectDeviceType());
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    window.addEventListener('orientationchange', updateDeviceType);

    const coarseQuery = window.matchMedia?.('(pointer: coarse)');
    const hoverQuery = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    coarseQuery?.addEventListener?.('change', updateDeviceType);
    hoverQuery?.addEventListener?.('change', updateDeviceType);

    return () => {
      window.removeEventListener('resize', updateDeviceType);
      window.removeEventListener('orientationchange', updateDeviceType);
      coarseQuery?.removeEventListener?.('change', updateDeviceType);
      hoverQuery?.removeEventListener?.('change', updateDeviceType);
    };
  }, []);

  const effectiveDevice: DetectedDeviceType = deviceMode === 'auto' ? detectedDevice : deviceMode;

  useEffect(() => {
    document.documentElement.dataset.device = effectiveDevice;
    document.documentElement.dataset.detectedDevice = detectedDevice;
  }, [effectiveDevice, detectedDevice]);

  return {
    detectedDevice,
    effectiveDevice,
  };
};
