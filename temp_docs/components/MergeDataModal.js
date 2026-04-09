import React from 'react';
const MergeDataModal = ({ isOpen, onMerge, onDiscardLocal }) => {
    if (!isOpen)
        return null;
    return (React.createElement("div", { className: "fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4", role: "dialog", "aria-modal": "true", "aria-labelledby": "merge-modal-title" },
        React.createElement("div", { className: "bg-bg-secondary rounded-lg shadow-2xl p-6 w-full max-w-sm text-center animate-fade-in-up" },
            React.createElement("h2", { id: "merge-modal-title", className: "text-xl font-bold text-text-primary mb-3" }, "\u05E1\u05E0\u05DB\u05E8\u05D5\u05DF \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA"),
            React.createElement("p", { className: "text-text-secondary mb-6" }, "\u05DE\u05E6\u05D0\u05E0\u05D5 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA \u05E2\u05DC \u05D4\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D4\u05D6\u05D4. \u05DE\u05D4 \u05EA\u05E8\u05E6\u05D4 \u05DC\u05E2\u05E9\u05D5\u05EA \u05D0\u05D9\u05EA\u05DF?"),
            React.createElement("div", { className: "flex flex-col gap-3" },
                React.createElement("button", { onClick: onMerge, className: "w-full bg-accent hover:bg-accent-hover text-white font-bold py-3 px-4 rounded-lg transition-colors" }, "\u05E9\u05DE\u05D5\u05E8 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DE\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4"),
                React.createElement("button", { onClick: onDiscardLocal, className: "w-full bg-bg-primary hover:bg-accent/20 text-text-primary font-bold py-3 px-4 rounded-lg transition-colors" }, "\u05D8\u05E2\u05DF \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DE\u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05DA")))));
};
export default MergeDataModal;
