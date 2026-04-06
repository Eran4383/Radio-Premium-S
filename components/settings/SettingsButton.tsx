import React from 'react';

interface SettingsButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-2 py-2 text-xs font-medium rounded-md transition-colors w-full min-h-[2.5rem] flex items-center justify-center text-center whitespace-normal leading-tight ${
            isActive ? 'bg-accent text-white' : 'bg-bg-primary hover:bg-accent/20'
        }`}
    >
        {label}
    </button>
);

export default SettingsButton;
