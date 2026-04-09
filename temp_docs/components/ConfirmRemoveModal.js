import React from 'react';
const ConfirmRemoveModal = ({ isOpen, stationName, onConfirm, onCancel }) => {
    if (!isOpen)
        return null;
    return (React.createElement("div", { className: "fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in-up", role: "dialog", "aria-modal": "true", onClick: onCancel },
        React.createElement("div", { className: "bg-bg-secondary rounded-lg shadow-2xl p-6 w-full max-w-sm text-center border border-gray-700", onClick: (e) => e.stopPropagation() },
            React.createElement("h2", { className: "text-xl font-bold text-text-primary mb-3" }, "\u05D4\u05E1\u05E8\u05D4 \u05DE\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD"),
            React.createElement("p", { className: "text-text-secondary mb-6" },
                "\u05D4\u05D0\u05DD \u05D1\u05E8\u05E6\u05D5\u05E0\u05DA \u05DC\u05D4\u05E1\u05D9\u05E8 \u05D0\u05EA ",
                React.createElement("strong", null, stationName),
                " \u05DE\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD?"),
            React.createElement("div", { className: "flex flex-col gap-3 sm:flex-row" },
                React.createElement("button", { onClick: onCancel, className: "flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors order-2 sm:order-1" }, "\u05D1\u05D9\u05D8\u05D5\u05DC"),
                React.createElement("button", { onClick: onConfirm, className: "flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors order-1 sm:order-2" }, "\u05DB\u05DF, \u05D4\u05E1\u05E8")))));
};
export default ConfirmRemoveModal;
