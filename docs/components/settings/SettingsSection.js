import React from 'react';
import { ChevronDownIcon } from '../Icons';
const SettingsSection = ({ title, children, isOpen, onToggle }) => {
    return (React.createElement("div", { className: "mb-4 bg-bg-secondary/50 rounded-lg border border-gray-700/50" },
        React.createElement("button", { onClick: onToggle, className: `w-full flex justify-between items-center p-3 bg-gray-800/50 hover:bg-gray-700/50 transition-colors ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}` },
            React.createElement("h3", { className: "text-sm font-semibold text-text-secondary" }, title),
            React.createElement(ChevronDownIcon, { className: `w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}` })),
        isOpen && (React.createElement("div", { className: "p-3 space-y-3 border-t border-gray-700/30" }, children))));
};
export default SettingsSection;
