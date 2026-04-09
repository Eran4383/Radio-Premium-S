import React from 'react';
const VersionHistory = ({ releaseNotes }) => (React.createElement("div", { className: "mb-4 text-xs text-text-secondary" },
    React.createElement("h4", { className: "font-bold text-sm text-text-primary mb-2" }, "\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D2\u05E8\u05E1\u05D0\u05D5\u05EA"),
    React.createElement("div", { className: "space-y-3 max-h-48 overflow-y-auto pr-2" }, releaseNotes.map(release => (React.createElement("div", { key: release.version },
        React.createElement("p", { className: "font-semibold text-text-primary" },
            "\u05D2\u05E8\u05E1\u05D4 ",
            release.version,
            " (",
            release.date,
            ")"),
        React.createElement("ul", { className: "list-disc list-inside space-y-1 mt-1" }, release.features.map((feature, index) => (React.createElement("li", { key: index }, feature))))))))));
export default VersionHistory;
