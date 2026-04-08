import React from 'react';
const ToggleSwitch = ({ label, enabled, onChange, disabled = false }) => (React.createElement("label", { className: `w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/10'} bg-bg-primary` },
    React.createElement("span", { className: "font-medium text-text-primary text-sm whitespace-normal leading-tight max-w-[70%]" }, label),
    React.createElement("div", { className: "relative inline-flex items-center cursor-pointer flex-shrink-0" },
        React.createElement("input", { type: "checkbox", checked: enabled, onChange: (e) => !disabled && onChange(e.target.checked), disabled: disabled, className: "sr-only peer", "aria-label": label }),
        React.createElement("div", { className: "w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-accent-focus peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" }))));
export default ToggleSwitch;
