import { useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Station, EqPreset, EQ_PRESETS, CustomEqSettings, StationTrackInfo, SmartPlaylistItem } from '../types';
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
}

export const useAudioEngine = ({
  status, station, volume, eqPreset, customEqSettings, shouldUseProxy, isSmartPlayerActive,
  onPlayerEvent, setFrequencyData, isPlaying, trackInfo, onPlay, onPause, onNext, onPrev
}: AudioEngineProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const filters = useRef<BiquadFilterNode[]>([]);
  const lastUpdate = useRef<number>(Date.now());
  const recoveryCount = useRef<number>(0);

  // State for Smart Resume (מנגנון שינה חכמה)
  const pauseTimestampRef = useRef<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stationUrl = station?.url_resolved;
  const stationFavicon = station?.favicon;
  const stationName = station?.name;

  const setupAudio = useCallback(() => {
    if (!audioRef.current || audioCtx.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtx.current = ctx;
    const source = ctx.createMediaElementSource(audioRef.current);
    const an = ctx.createAnalyser(); an.fftSize = 128; analyser.current = an;
    const f1 = ctx.createBiquadFilter(); f1.type = 'lowshelf'; f1.frequency.value = 250;
    const f2 = ctx.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 1000; f2.Q.value = 1;
    const f3 = ctx.createBiquadFilter(); f3.type = 'highshelf'; f3.frequency.value = 4000;
    filters.current = [f1, f2, f3];
    source.connect(f1).connect(f2).connect(f3).connect(an).connect(ctx.destination);
  }, []);

  const handleError = useCallback((e: any, ctx: string) => {
    if (e?.name === 'AbortError' || e?.message?.includes('interrupted')) return;
    if (e?.name === 'NotAllowedError' || e?.message?.includes('interaction')) onPlayerEvent({ type: 'AUTOPLAY_BLOCKED' });
    else onPlayerEvent({ type: 'STREAM_ERROR', payload: "שגיאה בנגינה" });
  }, [onPlayerEvent]);

  const attemptRecovery = useCallback(() => {
    if (!audioRef.current || !stationUrl || recoveryCount.current >= 3) return;
    recoveryCount.current++; lastUpdate.current = Date.now();
    const url = shouldUseProxy ? `${CORS_PROXY_URL}${stationUrl}` : stationUrl;
    audioRef.current.src = `${url}?r=${Date.now()}`;
    audioRef.current.play().catch(e => handleError(e, 'Recovery'));
  }, [stationUrl, shouldUseProxy, handleError]);

  // פונקציה חשופה לדילוג יזום בזמן (Next/Prev או Smart Resume)
  const switchToDvrAndSeek = useCallback((offsetSeconds: number) => {
    if (!audioRef.current || !stationUrl || !isSmartPlayerActive) return;
    let dvrUrl = stationUrl;
    if (dvrUrl.includes('streamgates.net') && !dvrUrl.includes('dvr_timeshift')) {
      dvrUrl = dvrUrl.substring(0, dvrUrl.lastIndexOf('/')) + '/playlist_dvr_timeshift-36000.m3u8';
    }
    if (shouldUseProxy) dvrUrl = `${CORS_PROXY_URL}${dvrUrl}`;

    if (hlsRef.current) { hlsRef.current.destroy(); }
    
    // אתחול HLS נקי ללא חסימות Low Latency
    const hls = new Hls({ enableWorker: true });
    hlsRef.current = hls;
    hls.loadSource(dvrUrl);
    hls.attachMedia(audioRef.current);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const liveEdge = hls.liveSyncPosition || audioRef.current!.duration;
      if (liveEdge) {
        audioRef.current!.currentTime = Math.max(0, liveEdge + offsetSeconds);
      }
      audioRef.current!.play().catch(e => handleError(e, 'DVR'));
    });
  }, [stationUrl, isSmartPlayerActive, shouldUseProxy, handleError]);

  // Effect 1: Station Lifecycle (טעינה ראשונית - לייב בלבד)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stationUrl) return;

    if (shouldUseProxy) setupAudio();

    let url = stationUrl;
    if (shouldUseProxy) { url = `${CORS_PROXY_URL}${url}`; audio.crossOrigin = 'anonymous'; }
    else audio.removeAttribute('crossOrigin');

    if (url.includes('.m3u8') && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      
      // הסוד לטעינה מיידית: הגדרות HLS ברירת מחדל! בלי lowLatency ובלי startPosition (-1).
      // הנגן יבחר את המקטע הבטוח ביותר וינגן באפס שיהוי.
      const hls = new Hls({ enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal && d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (d.fatal && d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      });
    } else {
      audio.src = url;
    }

    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [stationUrl, shouldUseProxy, setupAudio]);

  // Effect 2: Playback State & Smart Resume (מנגנון Play/Pause חכם)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (status === 'PLAYING') {
      // חובה במובייל - שחרור השתקת הדפדפן מחוסר פעילות
      if (audioCtx.current && audioCtx.current.state === 'suspended') audioCtx.current.resume();
      
      if (sleepTimerRef.current) { clearTimeout(sleepTimerRef.current); sleepTimerRef.current = null; }

      // התעוררות מ-Deep Sleep (אם הנגן הושמד בגלל שהשהינו מעל 3 דקות)
      if (!hlsRef.current && stationUrl?.includes('.m3u8') && Hls.isSupported()) {
        const gap = pauseTimestampRef.current ? (Date.now() - pauseTimestampRef.current) / 1000 : 0;
        if (gap > 0 && gap < 36000 && isSmartPlayerActive) {
          // חזרה חכמה - קפיצה אחורה ב-DVR
          switchToDvrAndSeek(-gap);
        } else {
          // טעינת Live מהירה (עברו יותר מ-10 שעות)
          const url = shouldUseProxy ? `${CORS_PROXY_URL}${stationUrl}` : stationUrl;
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(audio);
          hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play().catch(e => handleError(e, 'WakeUp')));
        }
      } else {
        // נגן חי וקיים (השהיה קצרה או טעינה ראשונית) - נגן מיד מתוך הבאפר!
        audio.play().catch(e => handleError(e, 'Status'));
      }
    } else if (['PAUSED', 'IDLE', 'ERROR'].includes(status)) {
      audio.pause();
      // הפעלת טיימר שינה עמוקה של 3 דקות
      if (status === 'PAUSED' && isSmartPlayerActive) {
        pauseTimestampRef.current = Date.now();
        sleepTimerRef.current = setTimeout(() => {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
            console.log('Deep Sleep: HLS destroyed to save battery');
          }
        }, 180000); 
      }
    }
  }, [status, stationUrl, shouldUseProxy, isSmartPlayerActive, switchToDvrAndSeek, handleError]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  useEffect(() => {
    if (filters.current.length < 3) return;
    const s = eqPreset === 'custom' ? customEqSettings : EQ_PRESETS[eqPreset as Exclude<EqPreset, 'custom'>];
    if (s) { filters.current[0].gain.value = s.bass; filters.current[1].gain.value = s.mid; filters.current[2].gain.value = s.treble; }
  }, [eqPreset, customEqSettings]);

  useEffect(() => {
    let frame: number;
    const loop = () => {
      if (analyser.current && isPlaying && shouldUseProxy) {
        const data = new Uint8Array(analyser.current.frequencyBinCount);
        analyser.current.getByteFrequencyData(data); setFrequencyData(data);
      } else if (isPlaying) setFrequencyData(new Uint8Array(64));
      frame = requestAnimationFrame(loop);
    };
    if (isPlaying) frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, shouldUseProxy, setFrequencyData]);

  useEffect(() => {
    if ('mediaSession' in navigator && stationName) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${stationName}${trackInfo?.program ? ` | ${trackInfo.program}` : ''}`,
        artist: trackInfo?.current || 'רדיו פרימיום',
        artwork: stationFavicon ? [{ src: stationFavicon, sizes: '96x96', type: 'image/png' }] : []
      });
      navigator.mediaSession.setActionHandler('play', onPlay);
      navigator.mediaSession.setActionHandler('pause', onPause);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      navigator.mediaSession.playbackState = status === 'PLAYING' ? 'playing' : 'paused';
    }
  }, [stationName, stationFavicon, status, trackInfo, onPlay, onPause, onNext, onPrev]);

  // Watchdog הועלה ל-15 שניות למניעת התערבות אגרסיבית
  useEffect(() => {
    if (status !== 'PLAYING') { recoveryCount.current = 0; return; }
    lastUpdate.current = Date.now();
    const up = () => { lastUpdate.current = Date.now(); };
    audioRef.current?.addEventListener('timeupdate', up);
    const iv = setInterval(() => {
      if (Date.now() - lastUpdate.current > 15000) { attemptRecovery(); }
    }, 5000);
    return () => { clearInterval(iv); audioRef.current?.removeEventListener('timeupdate', up); };
  }, [status, attemptRecovery]);

  return { audioRef, attemptRecovery, switchToDvrAndSeek };
};