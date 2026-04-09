import { useRef, useCallback } from 'react';
import { EqPreset, EQ_PRESETS, CustomEqSettings } from '../types';

export const useAudioContext = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);

  const setupAudioContext = useCallback((audioElement: HTMLAudioElement) => {
    if (audioContextRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const context = new AudioContextClass({});
      audioContextRef.current = context;
      
      const source = context.createMediaElementSource(audioElement);
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
    } catch (e) {
      console.error("Failed to initialize AudioContext", e);
    }
  }, []);

  const updateEq = useCallback((eqPreset: EqPreset, customEqSettings: CustomEqSettings) => {
    if (!bassFilterRef.current || !midFilterRef.current || !trebleFilterRef.current) return;
    const settings = eqPreset === 'custom' ? customEqSettings : EQ_PRESETS[eqPreset as Exclude<EqPreset, 'custom'>];
    if (settings) {
      bassFilterRef.current.gain.value = settings.bass;
      midFilterRef.current.gain.value = settings.mid;
      trebleFilterRef.current.gain.value = settings.treble;
    }
  }, []);

  return {
    audioContextRef,
    analyserRef,
    setupAudioContext,
    updateEq
  };
};
