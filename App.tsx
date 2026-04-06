import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useStations } from './hooks/useStations';
import { usePlayer } from './hooks/usePlayer';
import { useFavorites } from './hooks/useFavorites';
import { useTrackInfo } from './hooks/useTrackInfo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStationsLogic } from './hooks/useStationsLogic';
import MainLayout from './components/MainLayout';
import { GridSize, CATEGORY_SORTS } from './types/settings';

export default function App() {
  // 1. Hooks Layer
  const { user, isAdmin, isAuthReady, handleLogin, handleLogout } = useAuth();
  const { allSettings, setAllSettings, handleToggleSettingsSection, updateStatus, handleManualUpdateCheck, mergeModal, isCloudSyncing } = useSettings(user, isAuthReady);
  const { stations, stationsStatus, error, handleAdminUpdate } = useStations();
  
  const isFavorite = useCallback((uuid: string) => allSettings.favorites.includes(uuid), [allSettings.favorites]);
  const { pendingRemoval, toggleFavorite, confirmRemoval, cancelRemoval } = useFavorites(stations, allSettings, setAllSettings);
  
  const { displayedStations, currentSortOrder, setSortOrder, handleReorder } = useStationsLogic(stations, allSettings, setAllSettings, isFavorite);
  
  const { playerState, frequencyData, setFrequencyData, preMuteVolume, setPreMuteVolume, handleSelectStation, handlePlayPause, handleNext, handlePrev, handlePlayerEvent } = usePlayer(displayedStations);
  
  const { trackInfo, smartPlaylist } = useTrackInfo(playerState.station, allSettings.is100fmSmartPlayerEnabled);
  
  const [isRebinding, setIsRebinding] = useState(false);
  useKeyboardShortcuts({ allSettings, isRebinding, handlePlayPause, handleNext, handlePrev, setAllSettings, preMuteVolume, setPreMuteVolume });

  // 2. UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isVisualizerFullscreen, setIsVisualizerFullscreen] = useState(false);
  const [actionMenuState, setActionMenuState] = useState<{isOpen: boolean; songTitle: string | null}>({ isOpen: false, songTitle: null });
  
  const openActionMenu = useCallback((songTitle: string) => setActionMenuState({ isOpen: true, songTitle }), []);
  const closeActionMenu = useCallback(() => setActionMenuState({ isOpen: false, songTitle: null }), []);

  // 3. Side Effects (Orientation & Loader)
  useEffect(() => {
    if (isAuthReady && (stationsStatus === 'loaded' || stationsStatus === 'error')) {
      const loader = document.querySelector<HTMLElement>('.app-loader');
      if (loader) loader.style.display = 'none';
    }
  }, [isAuthReady, stationsStatus]);

  useEffect(() => {
    const handleOrientation = async () => {
      try {
        const orientation = screen.orientation as any;
        if (!allSettings.isScreenRotationEnabled && orientation?.lock) await orientation.lock('portrait');
        else if (allSettings.isScreenRotationEnabled && orientation?.unlock) orientation.unlock();
      } catch (e) { console.warn('Orientation lock failed:', e); }
    };
    handleOrientation();
  }, [allSettings.isScreenRotationEnabled]);

  // 4. Touch Handlers (Pinch Zoom)
  const pinchDistRef = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => { if (e.touches.length === 2) { e.preventDefault(); const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; pinchDistRef.current = Math.sqrt(dx * dx + dy * dy); } }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => { if (e.touches.length === 2 && pinchDistRef.current > 0) { e.preventDefault(); const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; const currentDist = Math.sqrt(dx * dx + dy * dy); const delta = currentDist - pinchDistRef.current; if (Math.abs(delta) > 40) { setAllSettings(s => ({...s, gridSize: (delta > 0 ? Math.min(5, s.gridSize + 1) : Math.max(1, s.gridSize - 1)) as GridSize})); pinchDistRef.current = currentDist; } } }, [setAllSettings]);
  const handleTouchEnd = useCallback(() => { pinchDistRef.current = 0; }, []);

  const currentCategoryIndex = CATEGORY_SORTS.findIndex((c: { order: string }) => c.order === currentSortOrder);
  const categoryButtonLabel = currentCategoryIndex !== -1 ? CATEGORY_SORTS[currentCategoryIndex].label : "קטגוריות";
  const handleCategorySortClick = () => { const nextIndex = (currentCategoryIndex + 1) % CATEGORY_SORTS.length; setSortOrder(CATEGORY_SORTS[nextIndex].order); };

  return (
    <MainLayout 
      user={user} isAdmin={isAdmin} onLogin={handleLogin} onLogout={handleLogout} isAdminPanelOpen={isAdminPanelOpen} setIsAdminPanelOpen={setIsAdminPanelOpen}
      allSettings={allSettings} setAllSettings={setAllSettings} isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen} handleToggleSettingsSection={handleToggleSettingsSection}
      handleManualUpdateCheck={handleManualUpdateCheck} updateStatus={updateStatus} isRebinding={isRebinding} setIsRebinding={setIsRebinding}
      stations={stations} displayedStations={displayedStations} stationsStatus={stationsStatus} error={error} handleSelectStation={handleSelectStation} isFavorite={isFavorite} toggleFavorite={toggleFavorite} handleReorder={handleReorder} handleAdminUpdate={handleAdminUpdate}
      playerState={playerState} handlePlayerEvent={handlePlayerEvent} handlePlayPause={handlePlayPause} handlePlay={handlePlayPause} handlePause={handlePlayPause} handleNext={handleNext} handlePrev={handlePrev} handleVolumeChange={(v) => setAllSettings(s => ({...s, volume: v}))}
      frequencyData={frequencyData} setFrequencyData={setFrequencyData as (data: Uint8Array) => void} trackInfo={trackInfo} smartPlaylist={smartPlaylist}
      isNowPlayingOpen={isNowPlayingOpen} setIsNowPlayingOpen={setIsNowPlayingOpen} isVisualizerFullscreen={isVisualizerFullscreen} setIsVisualizerFullscreen={setIsVisualizerFullscreen}
      actionMenuState={actionMenuState} closeActionMenu={closeActionMenu} openActionMenu={openActionMenu}
      mergeModal={mergeModal} pendingRemoval={pendingRemoval} confirmRemoval={confirmRemoval} cancelRemoval={cancelRemoval}
      currentSortOrder={currentSortOrder} setSortOrder={setSortOrder} handleCategorySortClick={handleCategorySortClick} categoryButtonLabel={categoryButtonLabel} currentCategoryIndex={currentCategoryIndex}
      handleTouchStart={handleTouchStart} handleTouchMove={handleTouchMove} handleTouchEnd={handleTouchEnd}
    />
  );
}
