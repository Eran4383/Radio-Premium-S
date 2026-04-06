import React from 'react';
import { ChevronDownIcon } from '../Icons';

interface SettingsSectionProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children, isOpen, onToggle }) => {
    return (
        <div className="mb-4 bg-bg-secondary/50 rounded-lg border border-gray-700/50">
            <button 
                onClick={onToggle}
                className={`w-full flex justify-between items-center p-3 bg-gray-800/50 hover:bg-gray-700/50 transition-colors ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}`}
            >
                <h3 className="text-sm font-semibold text-text-secondary">{title}</h3>
                <ChevronDownIcon className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-3 space-y-3 border-t border-gray-700/30">
                    {children}
                </div>
            )}
        </div>
    );
};

export default SettingsSection;
