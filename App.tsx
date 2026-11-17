import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { useStations } from './hooks/useStations';
import { usePlayer } from './hooks/usePlayer';
import { useFavorites } from './hooks/useFavorites';
import { useTrackInfo } from './hooks/useTrackInfo';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useStationsLogic } from './hooks/useStationsLogic';
import { useScreenProtection } from './hooks/useScreenProtection';
import { useDeviceType } from './hooks/useDeviceType';
import MainLayout from './components/MainLayout';
import { GridSize, CATEGORY_SORTS, SettingsEditScope, DeviceScopedSettingKey } from './types/settings';
import {
  mergeActiveSettingsForApp,
  resolveDeviceScopedForDevice,
  resolveForEditScope,
} from './services/deviceProfileService';

export default function App() {
  // 1. Device Detection & Hooks Layer
  const { detectedDevice } = useDeviceType('auto');
  const { user, isAdmin, isAuthReady, handleLogin, handleLogout } = useAuth();
  const {
    allSettings,
    setAllSettings,
    activeDeviceId,
    handleToggleSettingsSection,
    updateStatus,
    handleManualUpdateCheck,
    mergeModal,
    deviceRecoveryModal,
    confirmRecoveryProfile,
    createNewRecoveryProfile,
    updateScopedSettings,
    resetScopedOverrideKey,
    resetScopedAllOverrides,
    renameDeviceProfile,
    deleteDeviceProfile,
    switchActiveDeviceProfile,
  } = useSettings(user, isAuthReady, detectedDevice);

  // Resolve effective settings for this active browser/device (3-layer inheritance cascade)
  const activeDeviceResolution = useMemo(
    () => resolveDeviceScopedForDevice(allSettings, activeDeviceId, detectedDevice),
    [allSettings, activeDeviceId, detectedDevice]
  );
  const effectiveDevice = activeDeviceResolution.effectiveDeviceType;
  const activeSettings = useMemo(
    () => mergeActiveSettingsForApp(allSettings, activeDeviceResolution.resolved),
    [allSettings, activeDeviceResolution.resolved]
  );

  // Sync HTML data-device attribute with the profile-resolved effective device
  useEffect(() => {
    document.documentElement.dataset.device = effectiveDevice;
  }, [effectiveDevice]);

  // Edit Scope inside Settings Panel (defaults to current device, or device type)
  const [editScope, setEditScope] = useState<SettingsEditScope>(() =>
    activeDeviceId
      ? { kind: 'device', deviceId: activeDeviceId }
      : { kind: 'type', deviceType: detectedDevice }
  );

  // Keep editScope bound cleanly if activeDeviceId arrives or target profile is deleted
  useEffect(() => {
    if (editScope.kind === 'device') {
      const exists = Boolean(allSettings.deviceProfiles?.[editScope.deviceId]);
      if (!exists && activeDeviceId && allSettings.deviceProfiles?.[activeDeviceId]) {
        setEditScope({ kind: 'device', deviceId: activeDeviceId });
      }
    } else if (activeDeviceId && !allSettings.deviceProfiles?.[activeDeviceId]) {
      // keep type scope
    }
  }, [activeDeviceId, allSettings.deviceProfiles, editScope]);

  // Switch default editScope automatically when activeDeviceId first initializes
  const prevActiveDeviceIdRef = useRef<string | null>(activeDeviceId);
  useEffect(() => {
    if (activeDeviceId && activeDeviceId !== prevActiveDeviceIdRef.current) {
      setEditScope({ kind: 'device', deviceId: activeDeviceId });
    }
    prevActiveDeviceIdRef.current = activeDeviceId;
  }, [activeDeviceId]);

  const editingResolution = useMemo(
    () => resolveForEditScope(allSettings, editScope, detectedDevice),
    [allSettings, editScope, detectedDevice]
  );

  const { stations, stationsStatus, error, handleAdminUpdate } = useStations();

  const isFavorite = useCallback((uuid: string) => activeSettings.favorites.includes(uuid), [activeSettings.favorites]);
  const { pendingRemoval, toggleFavorite, confirmRemoval, cancelRemoval } = useFavorites(stations, activeSettings, setAllSettings);

  const { displayedStations, currentSortOrder, setSortOrder, handleReorder } = useStationsLogic(stations, activeSettings, setAllSettings, isFavorite);

  const { playerState, frequencyData, setFrequencyData, preMuteVolume, setPreMuteVolume, handleSelectStation, handlePlayPause, handleNext, handlePrev, handlePlayerEvent } = usePlayer(displayedStations);

  const { trackInfo } = useTrackInfo(playerState.station);

  const activeTargetScope: SettingsEditScope = useMemo(
    () =>
      activeDeviceId
        ? { kind: 'device', deviceId: activeDeviceId }
        : { kind: 'type', deviceType: effectiveDevice },
    [activeDeviceId, effectiveDevice]
  );

  const handleKeyboardEqPresetChange = useCallback(
    (preset: Parameters<typeof updateScopedSettings>[1]['eqPreset']) => {
      if (preset) updateScopedSettings(activeTargetScope, { eqPreset: preset });
    },
    [activeTargetScope, updateScopedSettings]
  );

  const [isRebinding, setIsRebinding] = useState(false);
  useKeyboardShortcuts({
    allSettings: activeSettings,
    isRebinding,
    handlePlayPause,
    handleNext,
    handlePrev,
    setAllSettings,
    onEqPresetChange: handleKeyboardEqPresetChange,
    preMuteVolume,
    setPreMuteVolume,
  });

  const {
    isDimmed,
    isPreviewingDim,
    isSliderPreviewing,
    wakeFromDim,
    toggleDimPreview,
    stopDimPreview,
    startSliderPreview,
    endSliderPreview,
  } = useScreenProtection({
    isWakeLockEnabled: activeSettings.isWakeLockEnabled,
    isPixelShiftEnabled: activeSettings.isPixelShiftEnabled,
    autoDimSeconds: activeSettings.autoDimSeconds,
    dimWakeMode: activeSettings.dimWakeMode,
    emergencyTimeoutMinutes: activeSettings.emergencyTimeoutMinutes,
    isPlayingOrLoading: playerState.status === 'PLAYING' || playerState.status === 'LOADING',
  });

  // 2. UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isVisualizerFullscreen, setIsVisualizerFullscreen] = useState(false);
  const [actionMenuState, setActionMenuState] = useState<{isOpen: boolean; songTitle: string | null}>({ isOpen: false, songTitle: null });

  const openActionMenu = useCallback((songTitle: string) => setActionMenuState({ isOpen: true, songTitle }), []);
  const closeActionMenu = useCallback(() => setActionMenuState({ isOpen: false, songTitle: null }), []);

  // 3. Side Effects (Loader)
  useEffect(() => {
    if (isAuthReady && (stationsStatus === 'loaded' || stationsStatus === 'error')) {
      const loader = document.querySelector<HTMLElement>('.app-loader');
      if (loader) loader.style.display = 'none';
    }
  }, [isAuthReady, stationsStatus]);

  // 4. Touch Handlers (Pinch Zoom writes to active device profile)
  const pinchDistRef = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => { if (e.touches.length === 2) { e.preventDefault(); const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; pinchDistRef.current = Math.sqrt(dx * dx + dy * dy); } }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistRef.current > 0) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const delta = currentDist - pinchDistRef.current;
      if (Math.abs(delta) > 40) {
        const nextGrid = (delta > 0 ? Math.min(5, activeSettings.gridSize + 1) : Math.max(0, activeSettings.gridSize - 1)) as GridSize;
        if (activeDeviceId) {
          updateScopedSettings({ kind: 'device', deviceId: activeDeviceId }, { gridSize: nextGrid });
        } else {
          setAllSettings(s => ({ ...s, gridSize: nextGrid }));
        }
        pinchDistRef.current = currentDist;
      }
    }
  }, [activeSettings.gridSize, activeDeviceId, updateScopedSettings, setAllSettings]);
  const handleTouchEnd = useCallback(() => { pinchDistRef.current = 0; }, []);

  const currentCategoryIndex = CATEGORY_SORTS.findIndex((c: { order: string }) => c.order === currentSortOrder);
  const categoryButtonLabel = currentCategoryIndex !== -1 ? CATEGORY_SORTS[currentCategoryIndex].label : "קטגוריות";
  const handleCategorySortClick = () => { const nextIndex = (currentCategoryIndex + 1) % CATEGORY_SORTS.length; setSortOrder(CATEGORY_SORTS[nextIndex].order); };

  const handleUpdateCurrentEditScope = useCallback(
    (partial: Parameters<typeof updateScopedSettings>[1]) => {
      updateScopedSettings(editScope, partial);
    },
    [editScope, updateScopedSettings]
  );

  const handleResetEditScopeKey = useCallback(
    (key: DeviceScopedSettingKey) => {
      if (editScope.kind === 'device') {
        resetScopedOverrideKey(editScope.deviceId, key);
      }
    },
    [editScope, resetScopedOverrideKey]
  );

  return (
    <MainLayout 
      user={user} isAdmin={isAdmin} onLogin={handleLogin} onLogout={handleLogout} isAdminPanelOpen={isAdminPanelOpen} setIsAdminPanelOpen={setIsAdminPanelOpen}
      allSettings={activeSettings}
      editingSettings={editingResolution.resolved}
      editingEffectiveDevice={editingResolution.effectiveType}
      overriddenKeys={editingResolution.overriddenKeys}
      editScope={editScope}
      onEditScopeChange={setEditScope}
      activeDeviceId={activeDeviceId}
      setAllSettings={setAllSettings}
      onUpdateScopedSettings={handleUpdateCurrentEditScope}
      onResetOverrideKey={handleResetEditScopeKey}
      onResetAllOverrides={resetScopedAllOverrides}
      onRenameDevice={renameDeviceProfile}
      onDeleteDevice={deleteDeviceProfile}
      onSwitchActiveDevice={switchActiveDeviceProfile}
      isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen} handleToggleSettingsSection={handleToggleSettingsSection}
      handleManualUpdateCheck={handleManualUpdateCheck} updateStatus={updateStatus} isRebinding={isRebinding} setIsRebinding={setIsRebinding}
      stations={stations} displayedStations={displayedStations} stationsStatus={stationsStatus} error={error} handleSelectStation={handleSelectStation} isFavorite={isFavorite} toggleFavorite={toggleFavorite} handleReorder={handleReorder} handleAdminUpdate={handleAdminUpdate}
      playerState={playerState} handlePlayerEvent={handlePlayerEvent} handlePlayPause={handlePlayPause} handlePlay={handlePlayPause} handlePause={handlePlayPause} handleNext={handleNext} handlePrev={handlePrev} handleVolumeChange={(v) => setAllSettings(s => ({...s, volume: v}))}
      frequencyData={frequencyData} setFrequencyData={setFrequencyData as (data: Uint8Array) => void} trackInfo={trackInfo}
      isNowPlayingOpen={isNowPlayingOpen} setIsNowPlayingOpen={setIsNowPlayingOpen} isVisualizerFullscreen={isVisualizerFullscreen} setIsVisualizerFullscreen={setIsVisualizerFullscreen}
      actionMenuState={actionMenuState} closeActionMenu={closeActionMenu} openActionMenu={openActionMenu}
      mergeModal={mergeModal}
      deviceRecoveryModal={deviceRecoveryModal}
      onConfirmRecoveryProfile={confirmRecoveryProfile}
      onCreateNewRecoveryProfile={createNewRecoveryProfile}
      pendingRemoval={pendingRemoval} confirmRemoval={confirmRemoval} cancelRemoval={cancelRemoval}
      currentSortOrder={currentSortOrder} setSortOrder={setSortOrder} handleCategorySortClick={handleCategorySortClick} categoryButtonLabel={categoryButtonLabel} currentCategoryIndex={currentCategoryIndex}
      handleTouchStart={handleTouchStart} handleTouchMove={handleTouchMove} handleTouchEnd={handleTouchEnd}
      isDimmed={isDimmed} isPreviewingDim={isPreviewingDim} isSliderPreviewing={isSliderPreviewing} wakeFromDim={wakeFromDim} toggleDimPreview={toggleDimPreview} stopDimPreview={stopDimPreview} startSliderPreview={startSliderPreview} endSliderPreview={endSliderPreview}
      detectedDevice={detectedDevice} effectiveDevice={effectiveDevice}
    />
  );
}
