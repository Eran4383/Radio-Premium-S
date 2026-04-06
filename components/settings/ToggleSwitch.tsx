import React from 'react';

interface ToggleSwitchProps {
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, enabled, onChange, disabled = false }) => (
     <label className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/10'} bg-bg-primary`}>
        <span className="font-medium text-text-primary text-sm whitespace-normal leading-tight max-w-[70%]">{label}</span>
        <div className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input 
                type="checkbox" 
                checked={enabled} 
                onChange={(e) => !disabled && onChange(e.target.checked)} 
                disabled={disabled}
                className="sr-only peer"
                aria-label={label}
            />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-accent-focus peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
        </div>
    </label>
);

export default ToggleSwitch;
