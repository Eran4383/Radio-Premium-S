import { useEffect, useRef } from 'react';

export const useWakeLock = (enabled: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    if (!isSupported) return;

    let isCancelled = false;

    const releaseWakeLock = async () => {
      const current = wakeLockRef.current;
      wakeLockRef.current = null;
      if (current && !current.released) {
        try {
          await current.release();
        } catch (err) {
          console.debug('Wake Lock release failed:', err);
        }
      }
    };

    const requestWakeLock = async () => {
      if (isCancelled || !enabled) return;
      if (document.visibilityState !== 'visible') return;
      if (wakeLockRef.current && !wakeLockRef.current.released) return;

      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (isCancelled || !enabled) {
          if (!sentinel.released) {
            await sentinel.release().catch(() => {});
          }
          return;
        }

        wakeLockRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current === sentinel) {
            wakeLockRef.current = null;
          }
        });
      } catch (err) {
        console.debug('Wake Lock request failed:', err);
      }
    };

    if (!enabled) {
      releaseWakeLock();
      return;
    }

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      } else {
        wakeLockRef.current = null;
      }
    };

    const handleUserInteraction = () => {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      releaseWakeLock();
    };
  }, [enabled]);
};
