import { useEffect, useRef } from 'react';

export const useVisualizer = (
  isPlaying: boolean,
  shouldUseProxy: boolean,
  analyser: AnalyserNode | null,
  setFrequencyData: (data: Uint8Array) => void
) => {
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const loop = () => {
      if (analyser && isPlaying && shouldUseProxy) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        setFrequencyData(dataArray);
      } else if (!shouldUseProxy && isPlaying) {
        setFrequencyData(new Uint8Array(64));
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    if (isPlaying) animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPlaying, setFrequencyData, shouldUseProxy, analyser]);
};
