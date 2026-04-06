import React, { useState } from 'react';
import { Station, GridSize, SortOrder } from '../types';
import { getCategory, CategoryType } from '../services/categoryService';
import StationCard from './StationCard';

interface StationListProps {
  stations: Station[];
  sortOrder: SortOrder;
  currentStation: Station | null;
  onSelectStation: (station: Station) => void;
  isFavorite: (stationUuid: string) => boolean;
  toggleFavorite: (stationUuid: string) => void;
  onReorder: (newOrder: string[]) => void;
  isStreamActive: boolean;
  isStatusIndicatorEnabled: boolean;
  gridSize: GridSize;
}

const getGridClasses = (size: GridSize) => {
  switch (size) {
    case 1: return 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8';
    case 2: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7';
    case 3: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
    case 4: return 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
    case 5: return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';
  }
};

const getCardContentClasses = (size: GridSize) => {
    switch (size) {
        case 1: return { img: 'w-16 h-16', text: 'text-xs h-8', padding: 'p-2' };
        case 2: return { img: 'w-20 h-20', text: 'text-sm h-10', padding: 'p-3' };
        case 3: return { img: 'w-24 h-24', text: 'text-sm h-10', padding: 'p-4' };
        case 4: return { img: 'w-28 h-28', text: 'text-base h-12', padding: 'p-4' };
        case 5: return { img: 'w-36 h-36', text: 'text-lg h-12', padding: 'p-4' };
        default: return { img: 'w-24 h-24', text: 'text-sm h-10', padding: 'p-4' };
    }
};

const StationList: React.FC<StationListProps> = ({ 
    stations, sortOrder, currentStation, onSelectStation, isFavorite, toggleFavorite, onReorder,
    isStreamActive, isStatusIndicatorEnabled, gridSize
}) => {
  const [draggedUuid, setDraggedUuid] = useState<string | null>(null);
  const [previewList, setPreviewList] = useState<Station[] | null>(null);
  const isDraggable = sortOrder === 'custom';
  const isGroupedView = sortOrder.startsWith('category_');

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, station: Station) => {
    if (!isDraggable) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', station.stationuuid);
    setDraggedUuid(station.stationuuid);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetStation: Station) => {
    if (!isDraggable) return;
    e.preventDefault();
    if (!draggedUuid || draggedUuid === targetStation.stationuuid) return;
    const currentList = previewList || stations;
    const draggedIndex = currentList.findIndex(s => s.stationuuid === draggedUuid);
    const targetIndex = currentList.findIndex(s => s.stationuuid === targetStation.stationuuid);
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
    const reorderedStations = [...currentList];
    const [draggedItem] = reorderedStations.splice(draggedIndex, 1);
    reorderedStations.splice(targetIndex, 0, draggedItem);
    setPreviewList(reorderedStations);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDraggable) return;
    e.preventDefault();
    if (previewList) onReorder(previewList.map(s => s.stationuuid));
    setDraggedUuid(null);
    setPreviewList(null);
  };
  
  const handleDragEnd = () => { if (!isDraggable) return; setDraggedUuid(null); setPreviewList(null); };
  const cardContentClasses = getCardContentClasses(gridSize);
  const gridClasses = getGridClasses(gridSize);

  const renderCard = (station: Station) => (
    <StationCard key={station.stationuuid} station={station} isDraggable={isDraggable} isCurrentlyPlaying={currentStation?.stationuuid === station.stationuuid} isStreamActive={isStreamActive} isStatusIndicatorEnabled={isStatusIndicatorEnabled} cardContentClasses={cardContentClasses} isFavorite={isFavorite(station.stationuuid)} toggleFavorite={toggleFavorite} onSelectStation={onSelectStation} onDragStart={handleDragStart} onDragOver={handleDragOver} draggedUuid={draggedUuid} />
  );

  if (isGroupedView) {
      const categoryType = sortOrder.replace('category_', '') as CategoryType;
      const groups: { categoryTitle: string; stations: Station[] }[] = [];
      if (stations.length > 0) {
          let currentCategory = getCategory(stations[0], categoryType);
          let currentStations: Station[] = [];
          for (const station of stations) {
              const stationCategory = getCategory(station, categoryType);
              if (stationCategory === currentCategory) currentStations.push(station);
              else {
                  if (currentStations.length > 0) groups.push({ categoryTitle: currentCategory, stations: currentStations });
                  currentCategory = stationCategory;
                  currentStations = [station];
              }
          }
          if (currentStations.length > 0) groups.push({ categoryTitle: currentCategory, stations: currentStations });
      }
      return (
          <div className="p-4 space-y-8">
              {groups.map((group, index) => (
                  <div key={`${group.categoryTitle}-${index}`}>
                      <h2 className="text-xl font-bold text-accent mb-4 px-2">{group.categoryTitle}</h2>
                      <div className={`grid ${gridClasses} gap-4`}>{group.stations.map(renderCard)}</div>
                  </div>
              ))}
          </div>
      );
  }

  const listToRender = previewList || stations;
  return (
    <div className={`grid ${gridClasses} gap-4 p-4`} onDragOver={(e) => isDraggable && e.preventDefault()} onDrop={handleDrop} onDragEnd={handleDragEnd}>
      {listToRender.map(renderCard)}
    </div>
  );
};

export default StationList;
