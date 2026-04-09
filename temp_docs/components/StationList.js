import React, { useState } from 'react';
import { getCategory } from '../services/categoryService';
import StationCard from './StationCard';
const getGridClasses = (size) => {
    switch (size) {
        case 1: return 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8';
        case 2: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7';
        case 3: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
        case 4: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
        case 5: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    }
};
const getCardContentClasses = (size) => {
    switch (size) {
        case 1: return { img: 'w-16 h-16', text: 'text-xs h-8', padding: 'p-2' };
        case 2: return { img: 'w-20 h-20', text: 'text-sm h-10', padding: 'p-3' };
        case 3: return { img: 'w-24 h-24', text: 'text-sm h-10', padding: 'p-4' };
        case 4: return { img: 'w-28 h-28', text: 'text-base h-12', padding: 'p-4' };
        case 5: return { img: 'w-36 h-36', text: 'text-lg h-12', padding: 'p-4' };
        default: return { img: 'w-24 h-24', text: 'text-sm h-10', padding: 'p-4' };
    }
};
const StationList = ({ stations, sortOrder, currentStation, onSelectStation, isFavorite, toggleFavorite, onReorder, isStreamActive, isStatusIndicatorEnabled, gridSize }) => {
    const [draggedUuid, setDraggedUuid] = useState(null);
    const [previewList, setPreviewList] = useState(null);
    const isDraggable = sortOrder === 'custom';
    const isGroupedView = sortOrder.startsWith('category_');
    const handleDragStart = (e, station) => {
        if (!isDraggable)
            return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', station.stationuuid);
        setDraggedUuid(station.stationuuid);
    };
    const handleDragOver = (e, targetStation) => {
        if (!isDraggable)
            return;
        e.preventDefault();
        if (!draggedUuid || draggedUuid === targetStation.stationuuid)
            return;
        const currentList = previewList || stations;
        const draggedIndex = currentList.findIndex(s => s.stationuuid === draggedUuid);
        const targetIndex = currentList.findIndex(s => s.stationuuid === targetStation.stationuuid);
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex)
            return;
        const reorderedStations = [...currentList];
        const [draggedItem] = reorderedStations.splice(draggedIndex, 1);
        reorderedStations.splice(targetIndex, 0, draggedItem);
        setPreviewList(reorderedStations);
    };
    const handleDrop = (e) => {
        if (!isDraggable)
            return;
        e.preventDefault();
        if (previewList)
            onReorder(previewList.map(s => s.stationuuid));
        setDraggedUuid(null);
        setPreviewList(null);
    };
    const handleDragEnd = () => { if (!isDraggable)
        return; setDraggedUuid(null); setPreviewList(null); };
    const cardContentClasses = getCardContentClasses(gridSize);
    const gridClasses = getGridClasses(gridSize);
    const renderCard = (station) => (React.createElement(StationCard, { key: station.stationuuid, station: station, isDraggable: isDraggable, isCurrentlyPlaying: currentStation?.stationuuid === station.stationuuid, isStreamActive: isStreamActive, isStatusIndicatorEnabled: isStatusIndicatorEnabled, cardContentClasses: cardContentClasses, isFavorite: isFavorite(station.stationuuid), toggleFavorite: toggleFavorite, onSelectStation: onSelectStation, onDragStart: handleDragStart, onDragOver: handleDragOver, draggedUuid: draggedUuid }));
    if (isGroupedView) {
        const categoryType = sortOrder.replace('category_', '');
        const groups = [];
        if (stations.length > 0) {
            let currentCategory = getCategory(stations[0], categoryType);
            let currentStations = [];
            for (const station of stations) {
                const stationCategory = getCategory(station, categoryType);
                if (stationCategory === currentCategory)
                    currentStations.push(station);
                else {
                    if (currentStations.length > 0)
                        groups.push({ categoryTitle: currentCategory, stations: currentStations });
                    currentCategory = stationCategory;
                    currentStations = [station];
                }
            }
            if (currentStations.length > 0)
                groups.push({ categoryTitle: currentCategory, stations: currentStations });
        }
        return (React.createElement("div", { className: "p-4 space-y-8" }, groups.map((group, index) => (React.createElement("div", { key: `${group.categoryTitle}-${index}` },
            React.createElement("h2", { className: "text-xl font-bold text-accent mb-4 px-2" }, group.categoryTitle),
            React.createElement("div", { className: `grid ${gridClasses} gap-4` }, group.stations.map(renderCard)))))));
    }
    const listToRender = previewList || stations;
    return (React.createElement("div", { className: `grid ${gridClasses} gap-4 p-4`, onDragOver: (e) => isDraggable && e.preventDefault(), onDrop: handleDrop, onDragEnd: handleDragEnd }, listToRender.map(renderCard)));
};
export default StationList;
