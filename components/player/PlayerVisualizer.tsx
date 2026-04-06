import React, { useRef, useEffect } from 'react';

interface PlayerVisualizerProps {
  frequencyData: Uint8Array;
}

const PlayerVisualizer: React.FC<PlayerVisualizerProps> = ({ frequencyData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const { width, height } = canvas;
        context.clearRect(0, 0, width, height);

        const computedStyle = getComputedStyle(document.documentElement);
        const accentColor = computedStyle.getPropertyValue('--accent').trim() || '#14b8a6';
        
        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(1, `${accentColor}40`);
        context.fillStyle = gradient;

        const bufferLength = frequencyData.length;
        const halfBuffer = Math.floor(bufferLength / 2);
        const centerX = width / 2;
        const barWidth = (width / 2) / halfBuffer;

        for (let i = 0; i < halfBuffer; i++) {
            const barHeight = (frequencyData[i] / 255) * height;
            // Draw right side
            context.fillRect(centerX + (i * barWidth), height - barHeight, barWidth - 1, barHeight);
            // Draw left side (mirrored)
            context.fillRect(centerX - ((i + 1) * barWidth), height - barHeight, barWidth - 1, barHeight);
        }
    }, [frequencyData]);

    return <canvas ref={canvasRef} width="300" height="4" className="absolute top-0 left-0 right-0 w-full h-1" />;
};

export default PlayerVisualizer;
