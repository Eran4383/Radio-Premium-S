import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';

export const useAdminAudioPreview = () => {
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const stop = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.onplaying = null;
      audioRef.current.onerror = null;
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {}
    }
    setPlayingKey(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const togglePlay = useCallback(
    (key: string, url: string, label?: string) => {
      setError(null);
      const trimmed = (url || '').trim();
      if (!trimmed) {
        setError('כתובת השידור ריקה');
        return;
      }

      if (playingKey === key) {
        stop();
        return;
      }

      stop();

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.muted = false;
      audio.volume = 1;
      setPlayingKey(key);
      setIsLoading(true);

      audio.onplaying = () => {
        setIsLoading(false);
      };

      audio.onerror = () => {
        setError(label ? `לא ניתן להשמיע את ${label}` : 'לא ניתן להשמיע את השידור מכתובת זו');
        stop();
      };

      if (trimmed.toLowerCase().includes('.m3u8') && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(trimmed);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().catch(() => {
            setError(label ? `לא ניתן להשמיע את ${label}` : 'לא ניתן להשמיע את השידור');
            stop();
          });
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError(label ? `שגיאה בטעינת ${label}` : 'שגיאה בטעינת השידור ב-HLS');
            stop();
          }
        });
      } else {
        audio.src = trimmed;
        audio.play().catch(() => {
          setError(label ? `לא ניתן להשמיע את ${label}` : 'לא ניתן להשמיע את השידור');
          stop();
        });
      }
    },
    [playingKey, stop]
  );

  return {
    playingKey,
    isLoading,
    error,
    setError,
    togglePlay,
    stop,
  };
};
