import React from 'react';
import { StarIcon } from './Icons';
const StationCard = ({ station, isDraggable, isCurrentlyPlaying, isStreamActive, isStatusIndicatorEnabled, cardContentClasses, isFavorite, toggleFavorite, onSelectStation, onDragStart, onDragOver, draggedUuid }) => {
    const isBeingDragged = draggedUuid === station.stationuuid;
    const baseClasses = `relative rounded-lg flex flex-col items-center justify-center text-center transform transition-all duration-300 ease-in-out ${isDraggable ? 'cursor-grab' : 'cursor-pointer'}`;
    const stateClasses = isCurrentlyPlaying
        ? 'bg-accent/30 ring-2 ring-accent scale-105'
        : 'bg-bg-secondary hover:bg-accent/10 hover:scale-105';
    const dragClasses = isBeingDragged ? 'dragging' : '';
    return (React.createElement("div", { draggable: isDraggable, onDragStart: (e) => onDragStart(e, station), onDragOver: (e) => onDragOver(e, station), className: `${baseClasses} ${stateClasses} ${dragClasses} ${cardContentClasses.padding}`, onClick: () => onSelectStation(station) },
        isStatusIndicatorEnabled && isCurrentlyPlaying && (React.createElement("div", { className: `absolute top-2 left-2 w-2.5 h-2.5 rounded-full ring-2 ring-bg-secondary transition-colors ${isStreamActive ? 'bg-accent animate-pulse' : 'bg-text-secondary'}`, title: isStreamActive ? "התחנה משדרת" : "מתחבר..." })),
        React.createElement("img", { src: station.favicon, alt: station.name, className: `${cardContentClasses.img} rounded-md mb-2 bg-gray-700 object-contain pointer-events-none transition-all duration-300`, onError: (e) => { e.currentTarget.src = 'https://picsum.photos/96'; } }),
        React.createElement("h4", { className: `font-semibold pointer-events-none text-text-primary transition-all duration-300 flex items-center ${cardContentClasses.text}` }, station.name),
        React.createElement("button", { onClick: (e) => {
                e.stopPropagation();
                toggleFavorite(station.stationuuid);
            }, className: "absolute top-2 right-2 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors", "aria-label": isFavorite ? "הסר ממועדפים" : "הוסף למועדפים" },
            React.createElement(StarIcon, { className: `w-5 h-5 ${isFavorite ? 'text-yellow-400' : 'text-text-secondary'}` }))));
};
export default StationCard;
