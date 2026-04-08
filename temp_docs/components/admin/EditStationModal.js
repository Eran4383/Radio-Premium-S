import React, { useState } from 'react';
const EditStationModal = ({ station, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ ...station });
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'bitrate' ? parseInt(value) || 0 : value
        }));
    };
    return (React.createElement("div", { className: "fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" },
        React.createElement("div", { className: "bg-bg-secondary p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto" },
            React.createElement("h3", { className: "text-xl font-bold mb-4" }, "\u05E2\u05E8\u05D9\u05DB\u05EA \u05EA\u05D7\u05E0\u05D4"),
            React.createElement("div", { className: "space-y-3" },
                React.createElement("div", null,
                    React.createElement("label", { className: "block text-xs text-text-secondary mb-1" }, "\u05E9\u05DD \u05D4\u05EA\u05D7\u05E0\u05D4"),
                    React.createElement("input", { name: "name", value: formData.name, onChange: handleChange, className: "w-full p-2 rounded bg-bg-primary border border-gray-700" })),
                React.createElement("div", null,
                    React.createElement("label", { className: "block text-xs text-text-secondary mb-1" }, "URL \u05DC\u05E9\u05D9\u05D3\u05D5\u05E8 (Stream)"),
                    React.createElement("input", { name: "url_resolved", value: formData.url_resolved, onChange: handleChange, className: "w-full p-2 rounded bg-bg-primary border border-gray-700 text-left text-xs", dir: "ltr" })),
                React.createElement("div", null,
                    React.createElement("label", { className: "block text-xs text-text-secondary mb-1" }, "\u05DC\u05D5\u05D2\u05D5 (URL)"),
                    React.createElement("div", { className: "flex gap-2" },
                        React.createElement("input", { name: "favicon", value: formData.favicon, onChange: handleChange, className: "w-full p-2 rounded bg-bg-primary border border-gray-700 text-left text-xs", dir: "ltr" }),
                        React.createElement("img", { src: formData.favicon, alt: "preview", className: "w-8 h-8 rounded bg-gray-700 object-cover", onError: e => e.target.src = '' }))),
                React.createElement("div", null,
                    React.createElement("label", { className: "block text-xs text-text-secondary mb-1" }, "\u05EA\u05D2\u05D9\u05D5\u05EA"),
                    React.createElement("input", { name: "tags", value: formData.tags, onChange: handleChange, className: "w-full p-2 rounded bg-bg-primary border border-gray-700" })),
                React.createElement("div", null,
                    React.createElement("label", { className: "block text-xs text-text-secondary mb-1" }, "UUID (\u05DE\u05D6\u05D4\u05D4 \u05D9\u05D9\u05D7\u05D5\u05D3\u05D9)"),
                    React.createElement("input", { name: "stationuuid", value: formData.stationuuid, disabled: true, className: "w-full p-2 rounded bg-bg-primary border border-gray-700 opacity-50 cursor-not-allowed text-xs" }))),
            React.createElement("div", { className: "flex gap-3 mt-6" },
                React.createElement("button", { onClick: onCancel, className: "flex-1 py-2 bg-gray-600 rounded hover:bg-gray-500" }, "\u05D1\u05D9\u05D8\u05D5\u05DC"),
                React.createElement("button", { onClick: () => onSave(formData), className: "flex-1 py-2 bg-accent text-white rounded hover:bg-accent-hover" }, "\u05E9\u05DE\u05D5\u05E8")))));
};
export default EditStationModal;
