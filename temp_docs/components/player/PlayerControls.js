import React from 'react';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPreviousIcon } from '../Icons';
const PlayerControls = ({ isActuallyPlaying, isLoading, onPlayPause, onSmartPrev, onSmartNext }) => {
    return (React.createElement("div", { className: "flex items-center gap-1 sm:gap-2" },
        React.createElement("button", { onClick: onSmartPrev, className: "p-2 text-text-secondary hover:text-text-primary", "aria-label": "\u05D4\u05E7\u05D5\u05D3\u05DD" },
            React.createElement(SkipPreviousIcon, { className: "w-6 h-6" })),
        React.createElement("button", { onClick: onPlayPause, className: "p-3 bg-accent text-white rounded-full shadow-md", "aria-label": isActuallyPlaying ? "השהה" : "נגן" }, isActuallyPlaying || isLoading ? React.createElement(PauseIcon, { className: "w-7 h-7" }) : React.createElement(PlayIcon, { className: "w-7 h-7" })),
        React.createElement("button", { onClick: onSmartNext, className: "p-2 text-text-secondary hover:text-text-primary", "aria-label": "\u05D4\u05D1\u05D0" },
            React.createElement(SkipNextIcon, { className: "w-6 h-6" }))));
};
export default PlayerControls;
