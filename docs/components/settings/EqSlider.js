import React from 'react';
const EqSlider = ({ label, value, onChange }) => (React.createElement("div", { className: "flex flex-col gap-1" },
    React.createElement("div", { className: "flex justify-between text-xs text-text-secondary" },
        React.createElement("span", null, label),
        React.createElement("span", null,
            value > 0 ? '+' : '',
            value,
            " dB")),
    React.createElement("input", { type: "range", min: "-10", max: "10", step: "1", value: value, onChange: (e) => onChange(parseInt(e.target.value, 10)), className: "w-full accent-teal-500 h-2 bg-bg-primary rounded-lg appearance-none cursor-pointer" })));
export default EqSlider;
