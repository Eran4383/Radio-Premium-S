import React from 'react';

interface EqSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
}

const EqSlider: React.FC<EqSliderProps> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-text-secondary">
            <span>{label}</span>
            <span>{value > 0 ? '+' : ''}{value} dB</span>
        </div>
        <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full accent-teal-500 h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer"
        />
    </div>
);

export default EqSlider;
