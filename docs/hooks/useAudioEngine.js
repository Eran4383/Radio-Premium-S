import { useRef, useEffect, useCallback, useState } from 'react';
import Hls from 'hls.js';
import { EQ_PRESETS } from '../types';
import { CORS_PROXY_URL } from '../config/constants';
export const useAudioEngine = ({ status, station, volume, eqPreset, customEqSettings, shouldUseProxy, isSmartPlayerActive, onPlayerEvent, setFrequencyData, isPlaying, trackInfo, onPlay, onPause, onNext, onPrev, smartPlaylist }) => {
    const audioRef = useRef(null);
    const hlsRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const bassFilterRef = useRef(null);
    const midFilterRef = useRef(null);
    const trebleFilterRef = useRef(null);
    const animationFrameRef = useRef();
    const lastTimeUpdateRef = useRef(Date.now());
    const recoveryAttemptRef = useRef(0);
    const watchdogIntervalRef = useRef(null);
    // Smart Resume & Dual Playlist state
    const [isDvrMode, setIsDvrMode] = useState(false);
    const [isDeepSleep, setIsDeepSleep] = useState(false);
    const pauseTimestampRef = useRef(null);
    const deepSleepTimeoutRef = useRef(null);
    const seekTargetRef = useRef(null);
    const statusRef = useRef(status);
    useEffect(() => {
        statusRef.current = status;
    }, [status]);
    // Reset DVR mode when station changes
    useEffect(() => {
        setIsDvrMode(false);
        setIsDeepSleep(false);
        seekTargetRef.current = null;
        pauseTimestampRef.current = null;
        if (deepSleepTimeoutRef.current) {
            clearTimeout(deepSleepTimeoutRef.current);
            deepSleepTimeoutRef.current = null;
        }
    }, [station?.url_resolved]);
    const switchToDvr = useCallback((targetUnixTimestamp) => {
        if (targetUnixTimestamp) {
            seekTargetRef.current = targetUnixTimestamp;
        }
        setIsDvrMode(true);
        setIsDeepSleep(false);
    }, []);
    const setupAudioContext = useCallback(() => {
        if (!audioRef.current || audioContextRef.current)
            return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const context = new AudioContextClass({});
            audioContextRef.current = context;
            const source = context.createMediaElementSource(audioRef.current);
            sourceRef.current = source;
            const analyser = context.createAnalyser();
            analyser.fftSize = 128;
            analyserRef.current = analyser;
            const bassFilter = context.createBiquadFilter();
            bassFilter.type = 'lowshelf';
            bassFilter.frequency.value = 250;
            bassFilterRef.current = bassFilter;
            const midFilter = context.createBiquadFilter();
            midFilter.type = 'peaking';
            midFilter.frequency.value = 1000;
            midFilter.Q.value = 1;
            midFilterRef.current = midFilter;
            const trebleFilter = context.createBiquadFilter();
            trebleFilter.type = 'highshelf';
            trebleFilter.frequency.value = 4000;
            trebleFilterRef.current = trebleFilter;
            source
                .connect(bassFilter)
                .connect(midFilter)
                .connect(trebleFilter)
                .connect(analyser)
                .connect(context.destination);
        }
        catch (e) {
            console.error("Failed to initialize AudioContext", e);
        }
    }, []);
    const handlePlayError = useCallback((e, context) => {
        const errorName = e?.name || '';
        const errorMessage = e?.message || String(e);
        const isAbort = errorName === 'AbortError' || errorMessage.includes('interrupted');
        const isNotAllowed = errorName === 'NotAllowedError' ||
            errorMessage.includes('user didn\'t interact') ||
            errorMessage.includes('interaction');
        if (isAbort) {
            console.debug(`${context} play() request was interrupted (normal behavior).`);
        }
        else if (isNotAllowed) {
            console.warn(`${context} play() blocked by browser policy. User interaction required.`);
            onPlayerEvent({ type: 'AUTOPLAY_BLOCKED' });
        }
        else {
            console.error(`${context} play() failed:`, e);
            onPlayerEvent({
                type: 'STREAM_ERROR',
                payload: context === 'Recovery' ? 'שגיאה בהתאוששות' : "לא ניתן לנגן את התחנה."
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
        let streamUrl = station.url_resolved;
        if (shouldUseProxy)
            streamUrl = `${CORS_PROXY_URL}${streamUrl}`;
        audio.src = '';
        audio.load();
        audio.src = `${streamUrl}?retry=${Date.now()}`;
        audio.load();
        audio.play().catch(e => handlePlayError(e, 'Recovery'));
    }, [station, onPlayerEvent, shouldUseProxy, handlePlayError]);
    // Effect 1: Station Load & HLS Setup (Listens ONLY to station/mode changes)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !station || isDeepSleep)
            return;
        if (shouldUseProxy) {
            setupAudioContext();
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume().catch(console.error);
            }
        }
        let streamUrl = station.url_resolved;
        // Dual Playlist Strategy: Only use DVR if isDvrMode is true
        if (isSmartPlayerActive && isDvrMode && streamUrl.includes('streamgates.net') && !streamUrl.includes('dvr_timeshift')) {
            const lastSlashIndex = streamUrl.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                streamUrl = `${streamUrl.substring(0, lastSlashIndex)}/playlist_dvr_timeshift-36000.m3u8`;
            }
        }
        if (shouldUseProxy)
            streamUrl = `${CORS_PROXY_URL}${streamUrl}`;
        const isHls = streamUrl.includes('.m3u8');
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
                if (seekTargetRef.current && audio.seekable.length) {
                    const now = Math.floor(Date.now() / 1000);
                    const secondsAgo = now - seekTargetRef.current;
                    const livePosition = audio.seekable.end(0);
                    const targetPosition = Math.max(0, livePosition - secondsAgo);
                    if (isFinite(targetPosition)) {
                        audio.currentTime = targetPosition;
                    }
                    seekTargetRef.current = null;
                }
                if (audio.paused && (statusRef.current === 'PLAYING' || statusRef.current === 'LOADING')) {
                    audio.play().catch(e => handlePlayError(e, 'HLS'));
                }
            });
            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR)
                        hls.startLoad();
                    else if (data.type === Hls.ErrorTypes.MEDIA_ERROR)
                        hls.recoverMediaError();
                    else
                        onPlayerEvent({ type: 'STREAM_ERROR', payload: "שגיאה בטעינת הזרם." });
                }
            });
        }
        else {
            if (audio.src !== streamUrl) {
                audio.src = streamUrl;
                if (shouldUseProxy)
                    audio.crossOrigin = 'anonymous';
                else
                    audio.removeAttribute('crossOrigin');
            }
            if (audio.paused && (statusRef.current === 'PLAYING' || statusRef.current === 'LOADING')) {
                audio.play().catch(e => handlePlayError(e, 'Standard'));
            }
        }
        // Cleanup function is the ONLY place where hls.destroy() is called
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
        };
    }, [station?.url_resolved, isDvrMode, isDeepSleep, shouldUseProxy, isSmartPlayerActive, setupAudioContext, onPlayerEvent, handlePlayError]);
    // Effect 2: Play/Pause (Listens ONLY to status)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio)
            return;
        if (status === 'PLAYING' || status === 'LOADING') {
            if (audio.paused && audio.src) {
                audio.play().catch(e => handlePlayError(e, 'Play/Pause Effect'));
            }
        }
        else if (status === 'PAUSED' || status === 'IDLE' || status === 'ERROR') {
            if (!audio.paused) {
                audio.pause();
            }
        }
    }, [status, handlePlayError]);
    // Effect 3: Deep Sleep & Smart Resume
    useEffect(() => {
        if (status === 'PAUSED') {
            pauseTimestampRef.current = Math.floor(Date.now() / 1000);
            deepSleepTimeoutRef.current = window.setTimeout(() => {
                setIsDeepSleep(true);
            }, 3 * 60 * 1000); // 3 minutes
        }
        else if (status === 'PLAYING') {
            if (deepSleepTimeoutRef.current) {
                clearTimeout(deepSleepTimeoutRef.current);
                deepSleepTimeoutRef.current = null;
            }
            if (isDeepSleep && pauseTimestampRef.current) {
                const gap = Math.floor(Date.now() / 1000) - pauseTimestampRef.current;
                if (gap < 10 * 3600) { // less than 10 hours
                    seekTargetRef.current = pauseTimestampRef.current;
                    setIsDvrMode(true);
                }
                else {
                    setIsDvrMode(false);
                }
                setIsDeepSleep(false); // Re-triggers Effect 1
            }
            pauseTimestampRef.current = null;
        }
        return () => {
            if (deepSleepTimeoutRef.current) {
                clearTimeout(deepSleepTimeoutRef.current);
            }
        };
    }, [status, isDeepSleep]);
    useEffect(() => { if (audioRef.current)
        audioRef.current.volume = volume; }, [volume]);
    useEffect(() => {
        if (!bassFilterRef.current || !midFilterRef.current || !trebleFilterRef.current)
            return;
        const settings = eqPreset === 'custom' ? customEqSettings : EQ_PRESETS[eqPreset];
        if (settings) {
            bassFilterRef.current.gain.value = settings.bass;
            midFilterRef.current.gain.value = settings.mid;
            trebleFilterRef.current.gain.value = settings.treble;
        }
    }, [eqPreset, customEqSettings]);
    useEffect(() => {
        const loop = () => {
            if (analyserRef.current && isPlaying && shouldUseProxy) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                setFrequencyData(dataArray);
            }
            else if (!shouldUseProxy && isPlaying) {
                setFrequencyData(new Uint8Array(64));
            }
            animationFrameRef.current = requestAnimationFrame(loop);
        };
        if (isPlaying)
            animationFrameRef.current = requestAnimationFrame(loop);
        return () => { if (animationFrameRef.current)
            cancelAnimationFrame(animationFrameRef.current); };
    }, [isPlaying, setFrequencyData, shouldUseProxy]);
    useEffect(() => {
        if ('mediaSession' in navigator && station) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `${station.name}${trackInfo?.program ? ` | ${trackInfo.program}` : ''}`,
                artist: trackInfo?.current || 'רדיו פרימיום',
                artwork: [{ src: station.favicon, sizes: '96x96', type: 'image/png' }],
            });
            navigator.mediaSession.setActionHandler('play', onPlay);
            navigator.mediaSession.setActionHandler('pause', onPause);
            navigator.mediaSession.setActionHandler('nexttrack', onNext);
            navigator.mediaSession.setActionHandler('previoustrack', onPrev);
            navigator.mediaSession.playbackState = status === 'PLAYING' ? 'playing' : 'paused';
        }
    }, [station, status, trackInfo, onPlay, onPause, onNext, onPrev]);
    useEffect(() => {
        const clearWatchdog = () => { if (watchdogIntervalRef.current) {
            clearInterval(watchdogIntervalRef.current);
            watchdogIntervalRef.current = null;
        } };
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
                if (timeSinceLastUpdate > 10000) { // Increased to 10s for more stability
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
        }
        else {
            clearWatchdog();
            recoveryAttemptRef.current = 0;
        }
        return clearWatchdog;
    }, [status, attemptRecovery]);
    return { audioRef, attemptRecovery, switchToDvr, isDvrMode };
};
