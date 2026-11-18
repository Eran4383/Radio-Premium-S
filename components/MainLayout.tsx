import React from 'react';
import {
  Station,
  StationFilter,
  SortOrder,
  User,
  AllSettings,
  StationTrackInfo,
  SettingsSections,
  GridSize,
  DetectedDeviceType,
  DeviceProfile,
  DeviceScopedSettingKey,
  DeviceScopedSettings,
  SettingsEditScope,
} from '../types';
import Player from './Player';
import StationList from './StationList';
import SettingsPanel from './SettingsPanel';
import NowPlaying from './NowPlaying';
import ActionMenu from './ActionMenu';
import AdminPanel from './AdminPanel';
import StationListSkeleton from './StationListSkeleton';
import MergeDataModal from './MergeDataModal';
import DeviceRecoveryModal from './DeviceRecoveryModal';
import ProfileAndDevicesModal from './ProfileAndDevicesModal';
import ConfirmRemoveModal from './ConfirmRemoveModal';
import DimOverlay from './DimOverlay';
import { MenuIcon } from './Icons';

interface MainLayoutProps {
  // Auth & Admin
  user: User | null;
  isAdmin: boolean;
  onLogin: () => void;
  onLogout: () => void;
  isAdminPanelOpen: boolean;
  setIsAdminPanelOpen: (open: boolean) => void;

  // Settings (active resolved settings for runtime + editScope resolved settings for panel)
  allSettings: AllSettings;
  editingSettings: DeviceScopedSettings;
  editingEffectiveDevice: DetectedDeviceType;
  overriddenKeys: Set<DeviceScopedSettingKey>;
  editScope: SettingsEditScope;
  onEditScopeChange: (scope: SettingsEditScope) => void;
  activeDeviceId: string | null;
  setAllSettings: React.Dispatch<React.SetStateAction<AllSettings>>;
  onUpdateScopedSettings: (partial: Partial<DeviceScopedSettings>) => void;
  onResetOverrideKey: (key: DeviceScopedSettingKey) => void;
  onResetAllOverrides: (deviceId: string) => void;
  onRenameDevice: (deviceId: string, newName: string) => void;
  onDeleteDevice: (deviceId: string) => void;
  onSwitchActiveDevice: (deviceId: string) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  handleToggleSettingsSection: (section: keyof SettingsSections) => void;
  handleManualUpdateCheck: () => void;
  updateStatus: any;
  isRebinding: boolean;
  setIsRebinding: (rebinding: boolean) => void;

  // Stations
  stations: Station[];
  displayedStations: Station[];
  stationsStatus: string;
  error: string | null;
  handleSelectStation: (station: Station) => void;
  isFavorite: (uuid: string) => boolean;
  toggleFavorite: (uuid: string) => void;
  handleReorder: (uuids: string[]) => void;
  handleAdminUpdate: (stations: Station[]) => void;

  // Player
  playerState: any;
  handlePlayerEvent: (event: any) => void;
  handlePlayPause: () => void;
  handlePlay: () => void;
  handlePause: () => void;
  handleNext: () => void;
  handlePrev: () => void;
  handleVolumeChange: (v: number) => void;
  frequencyData: Uint8Array;
  setFrequencyData: (data: Uint8Array) => void;
  trackInfo: StationTrackInfo | null;

  // UI State
  isNowPlayingOpen: boolean;
  setIsNowPlayingOpen: (open: boolean) => void;
  isVisualizerFullscreen: boolean;
  setIsVisualizerFullscreen: (fullscreen: boolean) => void;
  actionMenuState: { isOpen: boolean; songTitle: string | null };
  closeActionMenu: () => void;
  openActionMenu: (title: string) => void;

  // Modals
  mergeModal: { isOpen: boolean; onMerge: () => void; onDiscardLocal: () => void };
  deviceRecoveryModal: { isOpen: boolean; candidates: { profile: DeviceProfile; score: number }[]; suggestedName: string; detectedLabel?: string };
  onConfirmRecoveryProfile: (profileId: string) => void;
  onCreateNewRecoveryProfile: (name: string) => void;
  pendingRemoval: { uuid: string; name: string } | null;
  confirmRemoval: () => void;
  cancelRemoval: () => void;

  // Sorting & Filtering
  currentSortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  handleCategorySortClick: () => void;
  categoryButtonLabel: string;
  currentCategoryIndex: number;

  // Touch Handlers
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;

  // Screen Protection & Device Detection
  isDimmed: boolean;
  isPreviewingDim: boolean;
  isSliderPreviewing: boolean;
  wakeFromDim: () => void;
  toggleDimPreview: () => void;
  stopDimPreview: () => void;
  startSliderPreview: () => void;
  endSliderPreview: () => void;
  detectedDevice: DetectedDeviceType;
  effectiveDevice: DetectedDeviceType;
}

const SortButton: React.FC<{ label: string; order: SortOrder; currentOrder: SortOrder; setOrder: (order: SortOrder) => void }> = ({ label, order, currentOrder, setOrder }) => (
  <button onClick={() => setOrder(order)} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${ currentOrder === order ? 'bg-accent text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500' }`} >{label}</button>
);

const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const {
    user, isAdmin, onLogin, onLogout, isAdminPanelOpen, setIsAdminPanelOpen,
    allSettings, editingSettings, editingEffectiveDevice, overriddenKeys, editScope, onEditScopeChange, activeDeviceId,
    setAllSettings, onUpdateScopedSettings, onResetOverrideKey, onResetAllOverrides, onRenameDevice, onDeleteDevice, onSwitchActiveDevice,
    isSettingsOpen, setIsSettingsOpen, handleToggleSettingsSection,
    handleManualUpdateCheck, updateStatus, isRebinding, setIsRebinding,
    stations, displayedStations, stationsStatus, error, handleSelectStation, isFavorite, toggleFavorite, handleReorder, handleAdminUpdate,
    playerState, handlePlayerEvent, handlePlayPause, handlePlay, handlePause, handleNext, handlePrev, handleVolumeChange,
    frequencyData, setFrequencyData, trackInfo,
    isNowPlayingOpen, setIsNowPlayingOpen, isVisualizerFullscreen, setIsVisualizerFullscreen,
    actionMenuState, closeActionMenu, openActionMenu,
    mergeModal, deviceRecoveryModal, onConfirmRecoveryProfile, onCreateNewRecoveryProfile, pendingRemoval, confirmRemoval, cancelRemoval,
    currentSortOrder, setSortOrder, handleCategorySortClick, categoryButtonLabel, currentCategoryIndex,
    handleTouchStart, handleTouchMove, handleTouchEnd,
    isDimmed, isPreviewingDim, isSliderPreviewing, wakeFromDim, toggleDimPreview, stopDimPreview, startSliderPreview, endSliderPreview,
    detectedDevice, effectiveDevice
  } = props;

  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const isOverlayPreviewing = isPreviewingDim || isSliderPreviewing;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col overflow-x-clip">
      <DimOverlay
        isDimmed={isDimmed}
        isPreviewing={isPreviewingDim}
        isSliderPreviewing={isSliderPreviewing}
        dimLevel={isOverlayPreviewing ? editingSettings.dimLevel : allSettings.dimLevel}
        dimOpacity={isOverlayPreviewing ? editingSettings.dimOpacity : allSettings.dimOpacity}
        dimWakeMode={allSettings.dimWakeMode}
        onWake={wakeFromDim}
        onStopPreview={stopDimPreview}
      />
      <MergeDataModal {...mergeModal} />
      <DeviceRecoveryModal
        isOpen={deviceRecoveryModal.isOpen}
        candidates={deviceRecoveryModal.candidates}
        suggestedName={deviceRecoveryModal.suggestedName}
        detectedLabel={deviceRecoveryModal.detectedLabel}
        onSelectProfile={onConfirmRecoveryProfile}
        onCreateNew={onCreateNewRecoveryProfile}
      />
      <ProfileAndDevicesModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        customAvatarUrl={allSettings.customAvatarUrl}
        customDisplayName={allSettings.customDisplayName}
        onUpdateProfileInfo={(updates) => setAllSettings((s) => ({ ...s, ...updates }))}
        onLogin={onLogin}
        onLogout={onLogout}
        activeDeviceId={activeDeviceId}
        detectedDevice={detectedDevice}
        deviceProfiles={allSettings.deviceProfiles}
        onRenameDevice={onRenameDevice}
        onDeleteDevice={onDeleteDevice}
        onSwitchActiveDevice={onSwitchActiveDevice}
        onEditRemoteDevice={(deviceId) => {
          onEditScopeChange({ kind: 'device', deviceId });
          setIsSettingsOpen(true);
        }}
      />
      <ConfirmRemoveModal 
        isOpen={!!pendingRemoval}
        stationName={pendingRemoval?.name || ''}
        onConfirm={confirmRemoval}
        onCancel={cancelRemoval}
      />
      <AdminPanel 
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        currentStations={stations}
        onStationsUpdate={handleAdminUpdate}
        currentUserEmail={user?.email || null}
        favorites={allSettings.favorites}
      />
      
      <header className={`${effectiveDevice === 'mobile' ? 'p-3' : 'p-4'} bg-bg-secondary/50 backdrop-blur-sm sticky top-0 z-20 shadow-md`}>
        <div className="pixel-shift-target">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-text-secondary hover:text-text-primary" aria-label="הגדרות"><MenuIcon className="w-6 h-6" /></button>
              <div className="flex items-center bg-gray-700 rounded-full p-1">
                <button onClick={() => setAllSettings(s => ({...s, filter: StationFilter.All}))} className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${allSettings.filter === StationFilter.All ? 'bg-accent text-white' : 'text-gray-300'}`}>{StationFilter.All}</button>
                <button onClick={() => setAllSettings(s => ({...s, filter: StationFilter.Favorites}))} className={`px-4 py-1 text-sm font-medium rounded-full transition-colors ${allSettings.filter === StationFilter.Favorites ? 'bg-accent text-white' : 'text-gray-300'}`}>{StationFilter.Favorites}</button>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-accent">רדיו פרימיום</h1>
          </div>
          <div className="max-w-7xl mx-auto mt-4">
              <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-text-secondary">מיון:</span>
                  <div className="flex items-center bg-gray-700 rounded-full p-1 gap-1 flex-wrap justify-center">
                      <SortButton label="שלי" order="custom" currentOrder={currentSortOrder} setOrder={setSortOrder} />
                      <SortButton label="פופולריות" order="priority" currentOrder={currentSortOrder} setOrder={setSortOrder} />
                      <button onClick={() => setSortOrder(currentSortOrder === 'name_asc' ? 'name_desc' : 'name_asc')} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${currentSortOrder.startsWith('name_') ? 'bg-accent text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}>{currentSortOrder === 'name_desc' ? 'ת-א' : 'א-ת'}</button>
                      <button onClick={handleCategorySortClick} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${currentCategoryIndex !== -1 ? 'bg-accent text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}>{categoryButtonLabel}</button>
                  </div>
              </div>
          </div>
        </div>
      </header>
      <main className="flex-grow pb-48 pixel-shift-target" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {stationsStatus === 'loading' ? ( <StationListSkeleton /> ) : stationsStatus === 'error' ? ( <p className="text-center text-red-400 p-4">{error}</p> ) : displayedStations.length > 0 ? ( <StationList stations={displayedStations} currentStation={playerState.station} onSelectStation={handleSelectStation} isFavorite={isFavorite} toggleFavorite={toggleFavorite} onReorder={handleReorder} isStreamActive={playerState.status === 'PLAYING'} isStatusIndicatorEnabled={allSettings.isStatusIndicatorEnabled} gridSize={allSettings.gridSize} sortOrder={currentSortOrder} deviceType={effectiveDevice} /> ) : ( <div className="text-center p-8 text-text-secondary"> <h2 className="text-xl font-semibold">{allSettings.filter === StationFilter.Favorites ? 'אין תחנות במועדפים' : 'לא נמצאו תחנות'}</h2> <p>{allSettings.filter === StationFilter.Favorites ? 'אפשר להוסיף תחנות על ידי לחיצה על כפור הכוכב.' : 'נסה לרענן את העמוד.'}</p> </div> )}
      </main>
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={user} 
        customAvatarUrl={allSettings.customAvatarUrl}
        customDisplayName={allSettings.customDisplayName}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        isAdmin={isAdmin}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onLogin={onLogin} 
        onLogout={onLogout} 
        currentTheme={allSettings.theme} 
        onThemeChange={(v) => setAllSettings(s=>({...s, theme: v}))}
        editScope={editScope}
        onEditScopeChange={onEditScopeChange}
        activeDeviceId={activeDeviceId}
        deviceProfiles={allSettings.deviceProfiles}
        overriddenKeys={overriddenKeys}
        onResetOverrideKey={onResetOverrideKey}
        onResetAllOverrides={onResetAllOverrides}
        currentEqPreset={editingSettings.eqPreset} 
        onEqPresetChange={(v) => onUpdateScopedSettings({ eqPreset: v })} 
        isNowPlayingVisualizerEnabled={editingSettings.isNowPlayingVisualizerEnabled} 
        onNowPlayingVisualizerEnabledChange={(v) => onUpdateScopedSettings({ isNowPlayingVisualizerEnabled: v })} 
        isPlayerBarVisualizerEnabled={editingSettings.isPlayerBarVisualizerEnabled} 
        onPlayerBarVisualizerEnabledChange={(v) => onUpdateScopedSettings({ isPlayerBarVisualizerEnabled: v })} 
        isStatusIndicatorEnabled={editingSettings.isStatusIndicatorEnabled} 
        onStatusIndicatorEnabledChange={(v) => onUpdateScopedSettings({ isStatusIndicatorEnabled: v })} 
        isVolumeControlVisible={editingSettings.isVolumeControlVisible} 
        onVolumeControlVisibleChange={(v) => onUpdateScopedSettings({ isVolumeControlVisible: v })} 
        showNextSong={editingSettings.showNextSong} 
        onShowNextSongChange={(v) => onUpdateScopedSettings({ showNextSong: v })} 
        isWakeLockEnabled={editingSettings.isWakeLockEnabled}
        onWakeLockEnabledChange={(v) => onUpdateScopedSettings({ isWakeLockEnabled: v })}
        isPixelShiftEnabled={editingSettings.isPixelShiftEnabled}
        onPixelShiftEnabledChange={(v) => onUpdateScopedSettings({ isPixelShiftEnabled: v })}
        autoDimSeconds={editingSettings.autoDimSeconds}
        onAutoDimSecondsChange={(v) => onUpdateScopedSettings({ autoDimSeconds: v })}
        dimLevel={editingSettings.dimLevel}
        dimOpacity={editingSettings.dimOpacity}
        onDimPresetSelect={(level, opacity) => onUpdateScopedSettings({ dimLevel: level, dimOpacity: opacity })}
        onDimOpacityChange={(opacity) => onUpdateScopedSettings({ dimOpacity: opacity, dimLevel: editingSettings.dimLevel === 'warm' ? 'warm' : 'custom' })}
        isPreviewingDim={isPreviewingDim}
        onTogglePreviewDim={toggleDimPreview}
        onStopPreviewDim={stopDimPreview}
        onSliderPreviewStart={startSliderPreview}
        onSliderPreviewEnd={endSliderPreview}
        dimWakeMode={editingSettings.dimWakeMode}
        onDimWakeModeChange={(v) => onUpdateScopedSettings({ dimWakeMode: v })}
        emergencyTimeoutMinutes={editingSettings.emergencyTimeoutMinutes}
        onEmergencyTimeoutMinutesChange={(v) => onUpdateScopedSettings({ emergencyTimeoutMinutes: v })}
        customEqSettings={editingSettings.customEqSettings} 
        onCustomEqChange={(v) => onUpdateScopedSettings({ customEqSettings: v })} 
        deviceMode={editingSettings.deviceMode}
        onDeviceModeChange={(v) => onUpdateScopedSettings({ deviceMode: v })}
        detectedDevice={detectedDevice}
        effectiveDevice={editingEffectiveDevice}
        gridSize={editingSettings.gridSize} 
        onGridSizeChange={(v) => onUpdateScopedSettings({ gridSize: v })} 
        isMarqueeProgramEnabled={editingSettings.isMarqueeProgramEnabled} 
        onMarqueeProgramEnabledChange={(v) => onUpdateScopedSettings({ isMarqueeProgramEnabled: v })} 
        isMarqueeCurrentTrackEnabled={editingSettings.isMarqueeCurrentTrackEnabled} 
        onMarqueeCurrentTrackEnabledChange={(v) => onUpdateScopedSettings({ isMarqueeCurrentTrackEnabled: v })} 
        isMarqueeNextTrackEnabled={editingSettings.isMarqueeNextTrackEnabled} 
        onMarqueeNextTrackEnabledChange={(v) => onUpdateScopedSettings({ isMarqueeNextTrackEnabled: v })} 
        marqueeSpeed={editingSettings.marqueeSpeed} 
        onMarqueeSpeedChange={(v) => onUpdateScopedSettings({ marqueeSpeed: v })} 
        marqueeDelay={editingSettings.marqueeDelay} 
        onMarqueeDelayChange={(v) => onUpdateScopedSettings({ marqueeDelay: v })} 
        updateStatus={updateStatus} 
        onManualUpdateCheck={handleManualUpdateCheck} 
        keyMap={allSettings.keyMap} 
        onKeyMapChange={(v) => setAllSettings(s=>({...s, keyMap: v}))} 
        setIsRebinding={setIsRebinding} 
        openSections={allSettings.settingsSections} 
        onToggleSection={handleToggleSettingsSection} 
      />
      <NowPlaying 
        isOpen={isNowPlayingOpen} 
        onClose={() => setIsNowPlayingOpen(false)} 
        station={playerState.station} 
        isPlaying={playerState.status === 'PLAYING'}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrev={handlePrev}
        volume={allSettings.volume}
        onVolumeChange={handleVolumeChange}
        trackInfo={trackInfo} 
        showNextSong={allSettings.showNextSong}
        frequencyData={frequencyData} 
        isVisualizerEnabled={allSettings.isNowPlayingVisualizerEnabled} 
        visualizerStyle={allSettings.visualizerStyle} 
        onCycleVisualizerStyle={() => onUpdateScopedSettings({ visualizerStyle: (allSettings.visualizerStyle === 'bars' ? 'wave' : 'bars') })} 
        isVolumeControlVisible={allSettings.isVolumeControlVisible}
        marqueeDelay={allSettings.marqueeDelay} 
        isMarqueeProgramEnabled={allSettings.isMarqueeProgramEnabled} 
        isMarqueeCurrentTrackEnabled={allSettings.isMarqueeCurrentTrackEnabled} 
        isMarqueeNextTrackEnabled={allSettings.isMarqueeNextTrackEnabled} 
        marqueeSpeed={allSettings.marqueeSpeed} 
        onOpenActionMenu={openActionMenu} 
        isVisualizerFullscreen={isVisualizerFullscreen} 
        setIsVisualizerFullscreen={setIsVisualizerFullscreen} 
      />
      <ActionMenu isOpen={actionMenuState.isOpen} onClose={closeActionMenu} songTitle={actionMenuState.songTitle} />
      <Player 
        playerState={playerState} 
        onPlayPause={handlePlayPause} 
        onPlay={handlePlay} 
        onPause={handlePause} 
        onNext={handleNext} 
        onPrev={handlePrev} 
        onPlayerEvent={handlePlayerEvent} 
        eqPreset={allSettings.eqPreset} 
        customEqSettings={allSettings.customEqSettings} 
        volume={allSettings.volume} 
        onVolumeChange={handleVolumeChange} 
        trackInfo={trackInfo} 
        showNextSong={allSettings.showNextSong} 
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)} 
        setFrequencyData={setFrequencyData} 
        frequencyData={frequencyData} 
        isVisualizerEnabled={allSettings.isPlayerBarVisualizerEnabled} 
        shouldUseProxy={allSettings.isNowPlayingVisualizerEnabled || allSettings.isPlayerBarVisualizerEnabled} 
        marqueeDelay={allSettings.marqueeDelay} 
        isMarqueeProgramEnabled={allSettings.isMarqueeProgramEnabled} 
        isMarqueeCurrentTrackEnabled={allSettings.isMarqueeCurrentTrackEnabled} 
        isMarqueeNextTrackEnabled={allSettings.isMarqueeNextTrackEnabled} 
        marqueeSpeed={allSettings.marqueeSpeed} 
        onOpenActionMenu={openActionMenu} 
        deviceType={effectiveDevice}
      />
    </div>
  );
};

export default MainLayout;
