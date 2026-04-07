import { useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Station, EqPreset, EQ_PRESETS, CustomEqSettings, StationTrackInfo, SmartPlaylistItem } from '../types';
import { CORS_PROXY_URL } from '../config/constants';

interface AudioEngineProps {
  status: string; station: Station | null; volume: number; eqPreset: EqPreset;
  customEqSettings: CustomEqSettings; shouldUseProxy: boolean; isSmartPlayerActive: boolean;
  onPlayerEvent: (event: any) => void; setFrequencyData: (data: Uint8Array) => void;
  isPlaying: boolean; trackInfo: StationTrackInfo | null; onPlay: () => void;
  onPause: () => void; onNext: () => void; onPrev: () => void; smartPlaylist: SmartPlaylistItem[];
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
    if (!audioRef.current || !station || recoveryCount.current >= 3) return;
    recoveryCount.current++; lastUpdate.current = Date.now();
    const url = shouldUseProxy ? `${CORS_PROXY_URL}${station.url_resolved}` : station.url_resolved;
    audioRef.current.src = `${url}?r=${Date.now()}`;
    audioRef.current.play().catch(e => handleError(e, 'Recovery'));
  }, [station, shouldUseProxy, handleError]);

  // Effect 1: Station Lifecycle
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !station) return;
    if (shouldUseProxy) setupAudio();
    let url = station.url_resolved;
    if (isSmartPlayerActive && url.includes('streamgates.net') && !url.includes('dvr_timeshift')) {
      url = url.substring(0, url.lastIndexOf('/')) + '/playlist_dvr_timeshift-36000.m3u8';
    }
    if (shouldUseProxy) { url = `${CORS_PROXY_URL}${url}`; audio.crossOrigin = 'anonymous'; }
    else audio.removeAttribute('crossOrigin');
    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, startPosition: -1 });
      hlsRef.current = hls; hls.loadSource(url); hls.attachMedia(audio);
      hls.on(Hls.Events.ERROR, (_, d) => d.fatal && (d.type === Hls.ErrorTypes.NETWORK_ERROR ? hls.startLoad() : d.type === Hls.ErrorTypes.MEDIA_ERROR ? hls.recoverMediaError() : null));
    } else audio.src = url;
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [station, shouldUseProxy, isSmartPlayerActive, setupAudio]);

  // Effect 2: Playback State
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (status === 'PLAYING') {
      try { if (isSmartPlayerActive && audio.seekable.length > 0) audio.currentTime = audio.seekable.end(0); } catch(e){}
      audio.play().catch(e => handleError(e, 'Status'));
    } else if (['PAUSED', 'IDLE', 'ERROR'].includes(status)) audio.pause();
  }, [status, isSmartPlayerActive, handleError]);

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
    if ('mediaSession' in navigator && station) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${station.name}${trackInfo?.program ? ` | ${trackInfo.program}` : ''}`,
        artist: trackInfo?.current || 'רדיו פרימיום',
        artwork: [{ src: station.favicon, sizes: '96x96', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', onPlay);
      navigator.mediaSession.setActionHandler('pause', onPause);
      navigator.mediaSession.setActionHandler('nexttrack', onNext);
      navigator.mediaSession.setActionHandler('previoustrack', onPrev);
      navigator.mediaSession.playbackState = status === 'PLAYING' ? 'playing' : 'paused';
    }
  }, [station, status, trackInfo, onPlay, onPause, onNext, onPrev]);

  useEffect(() => {
    if (status !== 'PLAYING') { recoveryCount.current = 0; return; }
    lastUpdate.current = Date.now();
    const up = () => { lastUpdate.current = Date.now(); };
    audioRef.current?.addEventListener('timeupdate', up);
    const iv = setInterval(() => Date.now() - lastUpdate.current > 10000 && attemptRecovery(), 5000);
    return () => { clearInterval(iv); audioRef.current?.removeEventListener('timeupdate', up); };
  }, [status, attemptRecovery]);

  return { audioRef, attemptRecovery };
};
