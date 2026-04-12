import { useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Station, EqPreset, CustomEqSettings, StationTrackInfo, SmartPlaylistItem } from '../types';
import { CORS_PROXY_URL } from '../config/constants';

interface AudioEngineProps {
  status: string;
  station: Station | null;
  volume: number;
  eqPreset: EqPreset;
  customEqSettings: CustomEqSettings;
  shouldUseProxy: boolean;
  isSmartPlayerActive: boolean;
  onPlayerEvent: (event: any) => void;
  setFrequencyData: (data: Uint8Array) => void;
  isPlaying: boolean;
  trackInfo: StationTrackInfo | null;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  smartPlaylist: SmartPlaylistItem[];
  bluetoothAction: 'station' | 'track';
  onSmartNext: () => void;
  onSmartPrev: () => void;
}

export const useAudioEngine = ({
  status,
  station,
  volume,
  shouldUseProxy,
  isSmartPlayerActive,
  onPlayerEvent,
  isPlaying,
  trackInfo,
  onPlay,
  onPause,
  onNext,
  onPrev,
  bluetoothAction,
  onSmartNext,
  onSmartPrev,
}: AudioEngineProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTimeUpdateRef = useRef<number>(Date.now());
  const recoveryAttemptRef = useRef<number>(0);
  const watchdogIntervalRef = useRef<number | null>(null);
  const handoffDoneRef = useRef<string | null>(null);

  const isBypass = !!(station?.stationuuid?.startsWith('100fm-') || 
                     station?.url_resolved?.includes('streamgates.net'));

  const handlePlayError = useCallback((e: any, context: string) => {
    const errorName = e?.name || '';
    const errorMessage = e?.message || String(e);
    const isAbort = errorName === 'AbortError' || errorMessage.includes('interrupted');
    const isNotAllowed = errorName === 'NotAllowedError' || 
                         errorMessage.includes('user didn\'t interact') || 
                         errorMessage.includes('interaction');

    if (isAbort) {
      console.debug(`${context} play() request was interrupted (normal behavior).`);
    } else if (isNotAllowed) {
      console.warn(`${context} play() blocked by browser policy. User interaction required.`);
      onPlayerEvent({ type: 'AUTOPLAY_BLOCKED' });
    } else {
      console.error(`${context} play() failed:`, e);
      onPlayerEvent({ 
        type: 'STREAM_ERROR', 
        payload: "לא ניתן לנגן את התחנה." 
      });
    }
  }, [onPlayerEvent]);

  const attemptRecovery = useCallback(() => {
    if (!audioRef.current || !station || recoveryAttemptRef.current >= 3) {
      if (recoveryAttemptRef.current >= 3) {
        onPlayerEvent({ type: 'STREAM_ERROR', payload: "החיבור נכשל סופית" });
      }
      return;
    }

    recoveryAttemptRef.current += 1;
    lastTimeUpdateRef.current = Date.now();

    const audio = audioRef.current;
    const streamUrl = station.url_resolved;
          
    audio.src = '';
    audio.load();
    audio.src = `${streamUrl}${streamUrl.includes('?') ? '&' : '?' }retry=${Date.now()}`;
    audio.load();
    audio.play().catch(e => handlePlayError(e, 'Recovery'));
  }, [station, onPlayerEvent, handlePlayError]);

  const seekToSong = useCallback((timestamp: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.seekable.length) return;
    const now = Math.floor(Date.now() / 1000);
    const secondsAgo = now - timestamp;
    const livePosition = audio.seekable.end(0);
    const targetPosition = Math.max(0, livePosition - secondsAgo);
    if (isFinite(targetPosition)) {
        console.log(`[AudioEngine] Seeking to ${targetPosition} (Song timestamp: ${timestamp})`);
        audio.currentTime = targetPosition;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !station) return;

    const playAudio = async () => {
      let streamUrl = station.url_resolved;
      
      // Step 1: Instant Play for Bypass stations (100FM / Streamgates)
      if (isBypass) {
        if (audio.src !== streamUrl) {
          audio.src = streamUrl;
          audio.removeAttribute('crossOrigin');
        }
        audio.play().catch(e => handlePlayError(e, 'Standard (Instant)'));
        
        // Step 2 & 3: Background HLS Handoff (only if smart player is enabled)
        if (isSmartPlayerActive && handoffDoneRef.current !== station.stationuuid) {
          console.log("[AudioEngine] Starting background HLS handoff for 100FM...");
          
          let dvrUrl = streamUrl;
          if (dvrUrl.includes('streamgates.net') && !dvrUrl.includes('dvr_timeshift')) {
            const lastSlashIndex = dvrUrl.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
              dvrUrl = `${dvrUrl.substring(0, lastSlashIndex)}/playlist_dvr_timeshift-36000.m3u8`;
            }
          }
          
          const proxiedDvrUrl = `${CORS_PROXY_URL}${dvrUrl}`;
          
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
          
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hlsRef.current = hls;
            hls.loadSource(proxiedDvrUrl);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log("[AudioEngine] HLS Ready. Performing handoff...");
              handoffDoneRef.current = station.stationuuid;
              hls.attachMedia(audio);
              audio.play().catch(e => handlePlayError(e, 'HLS (Handoff)'));
            });
            
            hls.on(Hls.Events.ERROR, (_, data) => {
              if (data.fatal) {
                console.warn("[AudioEngine] Background HLS failed, staying on direct stream.");
                hls.destroy();
                hlsRef.current = null;
              }
            });
          }
        }
        return;
      }

      // Standard HLS/Direct logic for other stations
      const isHls = streamUrl.includes('.m3u8');
      if (shouldUseProxy) streamUrl = `${CORS_PROXY_URL}${streamUrl}`;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().catch(e => handlePlayError(e, 'HLS'));
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            else onPlayerEvent({ type: 'STREAM_ERROR', payload: "שגיאה בטעינת הזרם." });
          }
        });
      } else {
        if (audio.src !== streamUrl) {
          audio.src = streamUrl;
          if (shouldUseProxy) audio.crossOrigin = 'anonymous';
          else audio.removeAttribute('crossOrigin');
        }
        audio.play().catch(e => handlePlayError(e, 'Standard'));
      }
    };

    if (status === 'LOADING') {
      if (station && handoffDoneRef.current !== station.stationuuid) {
          handoffDoneRef.current = null;
      }
      playAudio();
    } else if (status === 'PAUSED' || status === 'IDLE' || status === 'ERROR') {
      audio.pause();
    }
  }, [status, station, onPlayerEvent, shouldUseProxy, isSmartPlayerActive, isBypass, handlePlayError]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [station?.stationuuid]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  
  useEffect(() => {
    if ('mediaSession' in navigator && station) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${station.name}${trackInfo?.program ? ` | ${trackInfo.program}` : ''}`,
        artist: trackInfo?.current || 'רדיו פרימיום',
        artwork: [{ src: station.favicon, sizes: '96x96', type: 'image/png' }],
      });
      navigator.mediaSession.setActionHandler('play', onPlay);
      navigator.mediaSession.setActionHandler('pause', onPause);
      
      const handleNextAction = () => {
        if (bluetoothAction === 'track' && isSmartPlayerActive) onSmartNext();
        else onNext();
      };
      const handlePrevAction = () => {
        if (bluetoothAction === 'track' && isSmartPlayerActive) onSmartPrev();
        else onPrev();
      };

      navigator.mediaSession.setActionHandler('nexttrack', handleNextAction);
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevAction);
      navigator.mediaSession.playbackState = status === 'PLAYING' ? 'playing' : 'paused';
    }
  }, [station, status, trackInfo, onPlay, onPause, onNext, onPrev, bluetoothAction, isSmartPlayerActive, onSmartNext, onSmartPrev]);

  useEffect(() => {
    const clearWatchdog = () => { if (watchdogIntervalRef.current) { clearInterval(watchdogIntervalRef.current); watchdogIntervalRef.current = null; } };
    const audio = audioRef.current;
    if (status === 'PLAYING') {
      clearWatchdog();
      lastTimeUpdateRef.current = Date.now();
      recoveryAttemptRef.current = 0;

      const handleTimeUpdate = () => {
        lastTimeUpdateRef.current = Date.now();
      };

      if (audio) {
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('playing', handleTimeUpdate);
      }

      watchdogIntervalRef.current = window.setInterval(() => {
        const timeSinceLastUpdate = Date.now() - lastTimeUpdateRef.current;
        if (timeSinceLastUpdate > 10000) {
          console.warn(`Watchdog triggered: No audio progress for ${timeSinceLastUpdate}ms. Attempting recovery...`);
          attemptRecovery();
        }
      }, 5000);

      return () => {
        clearWatchdog();
        if (audio) {
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('playing', handleTimeUpdate);
        }
      };
    } else {
      clearWatchdog();
      recoveryAttemptRef.current = 0;
    }
    return clearWatchdog;
  }, [status, attemptRecovery]);

  return { audioRef, attemptRecovery, seekToSong };
};
