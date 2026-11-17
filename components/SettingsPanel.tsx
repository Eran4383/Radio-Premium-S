import React, { useState, useEffect } from 'react';
import {
  Theme,
  EqPreset,
  THEMES,
  EQ_PRESET_KEYS,
  EQ_PRESET_LABELS,
  CustomEqSettings,
  GridSize,
  User,
  KeyMap,
  KeyAction,
  KEY_ACTION_LABELS,
  SettingsSections,
  DimLevel,
  DimWakeMode,
  DEVICE_MODES,
  DeviceMode,
  DetectedDeviceType,
  DEVICE_MODE_LABELS,
  DETECTED_DEVICE_LABELS,
  DeviceProfile,
  DeviceScopedSettingKey,
  SettingsEditScope,
} from '../types';
import Auth from './Auth';
import { BUILD_INFO } from '../buildInfo';
import SettingsButton from './settings/SettingsButton';
import ToggleSwitch from './settings/ToggleSwitch';
import EqSlider from './settings/EqSlider';
import SettingsSection from './settings/SettingsSection';
import ScreenProtectionSettings from './settings/ScreenProtectionSettings';
import DeviceProfileScopeBar from './settings/DeviceProfileScopeBar';
import OverrideHint from './settings/OverrideHint';
import VersionHistory from './settings/VersionHistory';

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'found' | 'not-found' | 'error';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  customAvatarUrl?: string | null;
  customDisplayName?: string | null;
  onOpenProfileModal: () => void;
  isAdmin: boolean;
  onOpenAdminPanel: () => void;
  onLogin: () => void;
  onLogout: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  // Device Profile & Scope Management
  editScope: SettingsEditScope;
  onEditScopeChange: (scope: SettingsEditScope) => void;
  activeDeviceId: string | null;
  deviceProfiles: Record<string, DeviceProfile>;
  overriddenKeys: Set<DeviceScopedSettingKey>;
  onResetOverrideKey: (key: DeviceScopedSettingKey) => void;
  onResetAllOverrides: (deviceId: string) => void;
  // Device-Scoped Settings (resolved for current editScope)
  currentEqPreset: EqPreset;
  onEqPresetChange: (preset: EqPreset) => void;
  isNowPlayingVisualizerEnabled: boolean;
  onNowPlayingVisualizerEnabledChange: (enabled: boolean) => void;
  isPlayerBarVisualizerEnabled: boolean;
  onPlayerBarVisualizerEnabledChange: (enabled: boolean) => void;
  isStatusIndicatorEnabled: boolean;
  onStatusIndicatorEnabledChange: (enabled: boolean) => void;
  isVolumeControlVisible: boolean;
  onVolumeControlVisibleChange: (enabled: boolean) => void;
  showNextSong: boolean;
  onShowNextSongChange: (enabled: boolean) => void;
  isWakeLockEnabled: boolean;
  onWakeLockEnabledChange: (enabled: boolean) => void;
  isPixelShiftEnabled: boolean;
  onPixelShiftEnabledChange: (enabled: boolean) => void;
  autoDimSeconds: number;
  onAutoDimSecondsChange: (seconds: number) => void;
  dimLevel: DimLevel;
  dimOpacity: number;
  onDimPresetSelect: (level: DimLevel, opacity: number) => void;
  onDimOpacityChange: (opacity: number) => void;
  isPreviewingDim: boolean;
  onTogglePreviewDim: () => void;
  onStopPreviewDim: () => void;
  onSliderPreviewStart: () => void;
  onSliderPreviewEnd: () => void;
  dimWakeMode: DimWakeMode;
  onDimWakeModeChange: (mode: DimWakeMode) => void;
  emergencyTimeoutMinutes: number;
  onEmergencyTimeoutMinutesChange: (minutes: number) => void;
  customEqSettings: CustomEqSettings;
  onCustomEqChange: (settings: CustomEqSettings) => void;
  deviceMode: DeviceMode;
  onDeviceModeChange: (mode: DeviceMode) => void;
  detectedDevice: DetectedDeviceType;
  effectiveDevice: DetectedDeviceType;
  gridSize: GridSize;
  onGridSizeChange: (size: GridSize) => void;
  isMarqueeProgramEnabled: boolean;
  onMarqueeProgramEnabledChange: (enabled: boolean) => void;
  isMarqueeCurrentTrackEnabled: boolean;
  onMarqueeCurrentTrackEnabledChange: (enabled: boolean) => void;
  isMarqueeNextTrackEnabled: boolean;
  onMarqueeNextTrackEnabledChange: (enabled: boolean) => void;
  marqueeSpeed: number;
  onMarqueeSpeedChange: (speed: number) => void;
  marqueeDelay: number;
  onMarqueeDelayChange: (delay: number) => void;
  updateStatus: UpdateStatus;
  onManualUpdateCheck: () => void;
  keyMap: KeyMap;
  onKeyMapChange: (keyMap: KeyMap) => void;
  setIsRebinding: (isRebinding: boolean) => void;
  openSections: SettingsSections;
  onToggleSection: (section: keyof SettingsSections) => void;
}

const releaseNotes = [
  {
    version: '1.2',
    date: '08.12.2025',
    features: [
        "שיפור ביצועים ויציבות בנגינת תחנות 100FM.",
        "שיפורים ביציבות זיהוי שירים.",
    ],
  },
  {
    version: '1.1',
    date: '08.12.2025',
    features: [
        "הוספת פאנל ניהול מתקדם.",
        "מנגנון עדכון גרסה אוטומטי.",
        "אפשרויות מיון חדשות בתפריט הניהול.",
    ],
  },
  {
    version: '1.0',
    date: '06.12.2025',
    features: [
        "אתחול גרסה רשמי.",
        "שיפור מנגנון זיהוי עדכונים באפליקציה מותקנת.",
        "תיקון באג ניגון אוטומטי (Autoplay) בדפדפנים.",
        "הוספת תמיכה בקיצורי מקלדת לדסקטופ."
    ],
  },
];

const DEFAULT_KEY_MAP: KeyMap = {
    playPause: [' ', 'Spacebar'],
    volumeUp: ['ArrowUp'],
    volumeDown: ['ArrowDown'],
    toggleMute: ['m', 'M', 'צ'],
    nextStation: ['ArrowRight'],
    prevStation: ['ArrowLeft'],
    toggleFullscreen: ['f', 'F', 'כ'],
    eqFlat: ['0'],
    eqBassBoost: ['1'],
    eqVocalBoost: ['2'],
    eqRock: ['3'],
    eqMovie: ['4'],
    eqCustom: ['5']
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
    isOpen, onClose, user, customAvatarUrl, customDisplayName, onOpenProfileModal, isAdmin, onOpenAdminPanel, onLogin, onLogout, currentTheme, onThemeChange,
    editScope, onEditScopeChange, activeDeviceId, deviceProfiles, overriddenKeys, onResetOverrideKey, onResetAllOverrides,
    currentEqPreset, onEqPresetChange,
    isNowPlayingVisualizerEnabled, onNowPlayingVisualizerEnabledChange,
    isPlayerBarVisualizerEnabled, onPlayerBarVisualizerEnabledChange,
    isStatusIndicatorEnabled, onStatusIndicatorEnabledChange, isVolumeControlVisible, onVolumeControlVisibleChange,
    showNextSong, onShowNextSongChange,
    isWakeLockEnabled, onWakeLockEnabledChange,
    isPixelShiftEnabled, onPixelShiftEnabledChange,
    autoDimSeconds, onAutoDimSecondsChange,
    dimLevel, dimOpacity, onDimPresetSelect, onDimOpacityChange, isPreviewingDim, onTogglePreviewDim, onStopPreviewDim, onSliderPreviewStart, onSliderPreviewEnd,
    dimWakeMode, onDimWakeModeChange,
    emergencyTimeoutMinutes, onEmergencyTimeoutMinutesChange,
    customEqSettings, onCustomEqChange,
    deviceMode, onDeviceModeChange, detectedDevice, effectiveDevice,
    gridSize, onGridSizeChange,
    isMarqueeProgramEnabled, onMarqueeProgramEnabledChange,
    isMarqueeCurrentTrackEnabled, onMarqueeCurrentTrackEnabledChange,
    isMarqueeNextTrackEnabled, onMarqueeNextTrackEnabledChange,
    marqueeSpeed, onMarqueeSpeedChange,
    marqueeDelay, onMarqueeDelayChange,
    updateStatus, onManualUpdateCheck,
    keyMap, onKeyMapChange,
    setIsRebinding,
    openSections, onToggleSection
 }) => {
  const [isVersionHistoryVisible, setIsVersionHistoryVisible] = useState(false);
  const [listeningFor, setListeningFor] = useState<KeyAction | null>(null);

  const isDeviceScope = editScope.kind === 'device';

  useEffect(() => {
    if (!isOpen) {
      onStopPreviewDim();
    }
  }, [isOpen, onStopPreviewDim]);
  
  useEffect(() => {
    if (!listeningFor) return;
    const handleRebind = (e: KeyboardEvent) => {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (e.key === 'Escape') { setListeningFor(null); setIsRebinding(false); return; }
        onKeyMapChange({ ...keyMap, [listeningFor]: [e.key] });
        setListeningFor(null); setIsRebinding(false);
    };
    window.addEventListener('keydown', handleRebind, { capture: true });
    return () => window.removeEventListener('keydown', handleRebind, { capture: true });
  }, [listeningFor, keyMap, onKeyMapChange, setIsRebinding]);

  const handleStartRebind = (action: KeyAction) => { setListeningFor(action); setIsRebinding(true); };
  const handleCancelRebind = (e: React.MouseEvent) => { e.stopPropagation(); setListeningFor(null); setIsRebinding(false); };

  const getUpdateStatusContent = () => {
      switch (updateStatus) {
        case 'checking': return 'בודק עדכונים...';
        case 'downloading': return 'מוריד עדכון...';
        case 'found': return 'העדכון מוכן להתקנה!';
        case 'not-found': return 'הגרסה עדכנית';
        case 'error': return 'שגיאה בבדיקה';
        default: return <span className="opacity-70">לחץ לבדיקת עדכונים</span>;
      }
    };

  const renderShortcut = (action: KeyAction) => (
    <div key={action} className="flex justify-between items-center p-2 bg-bg-primary rounded-lg">
        <span className="text-sm">{KEY_ACTION_LABELS[action]}</span>
        <div className="flex items-center gap-2">
            {listeningFor === action && (
                <button onClick={handleCancelRebind} className="text-red-400 hover:text-red-300 font-bold px-2" title="ביטול">✕</button>
            )}
            <button 
                onClick={() => handleStartRebind(action)}
                className={`px-3 py-1 text-xs rounded border transition-all ${
                    listeningFor === action ? 'bg-accent text-white border-accent animate-pulse' : 'bg-bg-secondary border-gray-600 text-text-secondary hover:border-text-primary'
                }`}
            >
                {listeningFor === action ? 'לחץ על מקש...' : keyMap[action][0].toUpperCase().replace(' ', 'Space')}
            </button>
        </div>
    </div>
  );

  const currentDeviceProfile = activeDeviceId ? deviceProfiles[activeDeviceId] || null : null;
  const headerDeviceName = currentDeviceProfile?.name || DETECTED_DEVICE_LABELS[detectedDevice];

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 z-30 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => { if (listeningFor) { setListeningFor(null); setIsRebinding(false); } onClose(); }}></div>
      <div className={`fixed top-0 right-0 h-full ${effectiveDevice === 'mobile' ? 'w-72' : 'w-80'} bg-bg-secondary shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-5 flex-shrink-0">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-text-primary leading-tight">הגדרות</h2>
                  {headerDeviceName && (
                    <p className="text-[9px] leading-tight text-text-secondary/75 mt-0.5 truncate max-w-[165px]" title={headerDeviceName}>
                      {headerDeviceName}
                    </p>
                  )}
                </div>
                <Auth
                  user={user}
                  customAvatarUrl={customAvatarUrl}
                  customDisplayName={customDisplayName}
                  onOpenProfileModal={onOpenProfileModal}
                  onLogin={onLogin}
                  onLogout={onLogout}
                />
            </div>
            {isAdmin && (
                <div className="mb-5 animate-fade-in-up">
                    <button onClick={() => { onClose(); onOpenAdminPanel(); }} className="w-full bg-accent/20 hover:bg-accent/40 text-accent border border-accent/50 font-bold py-3 px-4 rounded-lg transition-all">🛠️ פאנל ניהול</button>
                </div>
            )}

            <DeviceProfileScopeBar
              editScope={editScope}
              onEditScopeChange={onEditScopeChange}
              activeDeviceId={activeDeviceId}
              deviceProfiles={deviceProfiles}
              detectedDevice={detectedDevice}
              overriddenCount={overriddenKeys.size}
              onResetAllOverrides={onResetAllOverrides}
            />

            <SettingsSection title="אקולייזר (EQ)" isOpen={openSections.eq} onToggle={() => onToggleSection('eq')}>
                <div className="grid grid-cols-3 gap-2 mb-1">
                    {EQ_PRESET_KEYS.map(preset => <SettingsButton key={preset} label={EQ_PRESET_LABELS[preset]} isActive={currentEqPreset === preset} onClick={() => onEqPresetChange(preset)} />)}
                </div>
                {isDeviceScope && (
                  <OverrideHint
                    settingKey="eqPreset"
                    isOverridden={overriddenKeys.has('eqPreset')}
                    onResetKey={onResetOverrideKey}
                  />
                )}
                 {currentEqPreset === 'custom' && (
                    <div className="p-3 rounded-lg bg-bg-primary space-y-3 mt-2">
                        <EqSlider label="בס (Bass)" value={customEqSettings.bass} onChange={(val) => onCustomEqChange({ ...customEqSettings, bass: val })} />
                        <EqSlider label="אמצע (Mid)" value={customEqSettings.mid} onChange={(val) => onCustomEqChange({ ...customEqSettings, mid: val })} />
                        <EqSlider label="גבוהים (Treble)" value={customEqSettings.treble} onChange={(val) => onCustomEqChange({ ...customEqSettings, treble: val })} />
                        {isDeviceScope && (
                          <OverrideHint
                            settingKey="customEqSettings"
                            isOverridden={overriddenKeys.has('customEqSettings')}
                            onResetKey={onResetOverrideKey}
                          />
                        )}
                    </div>
                )}
            </SettingsSection>
            <SettingsSection title="ממשק" isOpen={openSections.interface} onToggle={() => onToggleSection('interface')}>
                <div className="space-y-2">
                    {isDeviceScope && (
                      <div className="p-3 rounded-lg bg-bg-primary space-y-2">
                         <div className="flex justify-between items-center text-sm font-medium text-text-primary">
                           <span>סוג מסך ומכשיר</span>
                           <span className="text-[11px] text-accent font-semibold">
                             {DETECTED_DEVICE_LABELS[effectiveDevice]}
                           </span>
                         </div>
                         <div className="grid grid-cols-4 gap-1.5">
                           {DEVICE_MODES.map(mode => (
                             <SettingsButton
                               key={mode}
                               label={DEVICE_MODE_LABELS[mode]}
                               isActive={deviceMode === mode}
                               onClick={() => onDeviceModeChange(mode)}
                             />
                           ))}
                         </div>
                         <p className="text-[11px] text-text-secondary leading-snug">
                           {deviceMode === 'auto'
                             ? `זוהה אוטומטית: ${DETECTED_DEVICE_LABELS[detectedDevice]}. מתאים את עמודות התחנות ורוחב הממשק.`
                             : `מצב ידני: ${DETECTED_DEVICE_LABELS[effectiveDevice]} (זוהה במכשיר: ${DETECTED_DEVICE_LABELS[detectedDevice]}).`}
                         </p>
                         <OverrideHint
                           settingKey="deviceMode"
                           isOverridden={overriddenKeys.has('deviceMode')}
                           onResetKey={onResetOverrideKey}
                         />
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-bg-primary space-y-3">
                       <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm font-medium text-text-primary"><span>גודל תצוגה</span></div>
                          <div className="flex justify-between text-xs text-text-secondary px-1"><span>דחוס מאוד</span><span>גדול</span></div>
                          <input type="range" min="0" max="5" step="1" value={gridSize} onChange={(e) => onGridSizeChange(parseInt(e.target.value, 10) as GridSize)} className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                       </div>
                       {isDeviceScope && (
                         <OverrideHint
                           settingKey="gridSize"
                           isOverridden={overriddenKeys.has('gridSize')}
                           onResetKey={onResetOverrideKey}
                         />
                       )}
                    </div>
                    <h4 className="text-xs font-semibold text-text-secondary pt-2 px-3">טקסט נע</h4>
                    <div>
                      <ToggleSwitch label="שם תחנה / תוכנית" enabled={isMarqueeProgramEnabled} onChange={onMarqueeProgramEnabledChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="isMarqueeProgramEnabled"
                          isOverridden={overriddenKeys.has('isMarqueeProgramEnabled')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                    <div>
                      <ToggleSwitch label="שם שיר נוכחי" enabled={isMarqueeCurrentTrackEnabled} onChange={onMarqueeCurrentTrackEnabledChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="isMarqueeCurrentTrackEnabled"
                          isOverridden={overriddenKeys.has('isMarqueeCurrentTrackEnabled')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                    <div>
                      <ToggleSwitch label="שיר הבא" enabled={isMarqueeNextTrackEnabled} onChange={onMarqueeNextTrackEnabledChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="isMarqueeNextTrackEnabled"
                          isOverridden={overriddenKeys.has('isMarqueeNextTrackEnabled')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                    <div className="p-3 rounded-lg bg-bg-primary space-y-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm font-medium text-text-primary"><span>מהירות גלילה</span></div>
                          <div className="flex justify-between text-xs text-text-secondary px-1"><span>איטי</span><span>מהיר</span></div>
                          <input type="range" min="1" max="10" step="1" value={marqueeSpeed} onChange={(e) => onMarqueeSpeedChange(parseInt(e.target.value, 10))} className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                          {isDeviceScope && (
                            <OverrideHint
                              settingKey="marqueeSpeed"
                              isOverridden={overriddenKeys.has('marqueeSpeed')}
                              onResetKey={onResetOverrideKey}
                            />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm font-medium text-text-primary"><span>השהיה בין גלילות</span><span>{marqueeDelay} ש'</span></div>
                          <input type="range" min="1" max="10" step="1" value={marqueeDelay} onChange={(e) => onMarqueeDelayChange(parseInt(e.target.value, 10))} className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                          {isDeviceScope && (
                            <OverrideHint
                              settingKey="marqueeDelay"
                              isOverridden={overriddenKeys.has('marqueeDelay')}
                              onResetKey={onResetOverrideKey}
                            />
                          )}
                        </div>
                    </div>
                    <h4 className="text-xs font-semibold text-text-secondary pt-2 px-3">כללי</h4>
                    <div>
                      <ToggleSwitch label="תצוגה גרפית (מסך מלא)" enabled={isNowPlayingVisualizerEnabled} onChange={onNowPlayingVisualizerEnabledChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="isNowPlayingVisualizerEnabled"
                          isOverridden={overriddenKeys.has('isNowPlayingVisualizerEnabled')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                    <div>
                      <ToggleSwitch label="תצוגה גרפית (נגן תחתון)" enabled={isPlayerBarVisualizerEnabled} onChange={onPlayerBarVisualizerEnabledChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="isPlayerBarVisualizerEnabled"
                          isOverridden={overriddenKeys.has('isPlayerBarVisualizerEnabled')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                    <div>
                      <ToggleSwitch label="הצג חיווי מצב" enabled={isStatusIndicatorEnabled} onChange={onStatusIndicatorEnabledChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="isStatusIndicatorEnabled"
                          isOverridden={overriddenKeys.has('isStatusIndicatorEnabled')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                    <div>
                      <ToggleSwitch label="הצג בקרת עוצמה" enabled={isVolumeControlVisible} onChange={onVolumeControlVisibleChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="isVolumeControlVisible"
                          isOverridden={overriddenKeys.has('isVolumeControlVisible')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                    <div>
                      <ToggleSwitch label="הצג שיר הבא" enabled={showNextSong} onChange={onShowNextSongChange} />
                      {isDeviceScope && (
                        <OverrideHint
                          settingKey="showNextSong"
                          isOverridden={overriddenKeys.has('showNextSong')}
                          onResetKey={onResetOverrideKey}
                        />
                      )}
                    </div>
                </div>
            </SettingsSection>
            <SettingsSection title="שמירה והגנה על המסך" isOpen={openSections.screenProtection} onToggle={() => onToggleSection('screenProtection')}>
                <ScreenProtectionSettings
                    isWakeLockEnabled={isWakeLockEnabled}
                    onWakeLockEnabledChange={onWakeLockEnabledChange}
                    isPixelShiftEnabled={isPixelShiftEnabled}
                    onPixelShiftEnabledChange={onPixelShiftEnabledChange}
                    autoDimSeconds={autoDimSeconds}
                    onAutoDimSecondsChange={onAutoDimSecondsChange}
                    dimLevel={dimLevel}
                    dimOpacity={dimOpacity}
                    onDimPresetSelect={onDimPresetSelect}
                    onDimOpacityChange={onDimOpacityChange}
                    isPreviewingDim={isPreviewingDim}
                    onTogglePreviewDim={onTogglePreviewDim}
                    onSliderPreviewStart={onSliderPreviewStart}
                    onSliderPreviewEnd={onSliderPreviewEnd}
                    dimWakeMode={dimWakeMode}
                    onDimWakeModeChange={onDimWakeModeChange}
                    emergencyTimeoutMinutes={emergencyTimeoutMinutes}
                    onEmergencyTimeoutMinutesChange={onEmergencyTimeoutMinutesChange}
                    overriddenKeys={isDeviceScope ? overriddenKeys : undefined}
                    onResetOverrideKey={isDeviceScope ? onResetOverrideKey : undefined}
                />
            </SettingsSection>
            <div className="my-3 flex items-center gap-2 px-1" role="separator" aria-label="הגדרות גלובליות">
                <div className="h-px flex-1 bg-gray-700/60" />
                <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">
                  הגדרות גלובליות (לכל המכשירים)
                </span>
                <div className="h-px flex-1 bg-gray-700/60" />
            </div>

            <SettingsSection title="ערכת נושא" isOpen={openSections.theme} onToggle={() => onToggleSection('theme')}>
                <div className="grid grid-cols-4 gap-2">
                    {THEMES.map(theme => <SettingsButton key={theme} label={theme} isActive={currentTheme === theme} onClick={() => onThemeChange(theme)} />)}
                </div>
            </SettingsSection>

            <SettingsSection title="קיצורי מקלדת" isOpen={openSections.shortcuts} onToggle={() => onToggleSection('shortcuts')}>
                <div className="space-y-2">
                    {effectiveDevice !== 'desktop' && (
                      <p className="text-[11px] text-text-secondary px-1 leading-snug">
                        מותאם בעיקר למחשב (זמין גם עם מקלדת חיצונית).
                      </p>
                    )}
                    <h4 className="text-xs font-semibold text-text-secondary pt-1 px-1">כללי</h4>
                    {(['playPause', 'volumeUp', 'volumeDown', 'toggleMute', 'nextStation', 'prevStation', 'toggleFullscreen'] as KeyAction[]).map(renderShortcut)}
                    <h4 className="text-xs font-semibold text-text-secondary pt-3 px-1">אקולייזר</h4>
                    {(['eqFlat', 'eqBassBoost', 'eqVocalBoost', 'eqRock', 'eqMovie', 'eqCustom'] as KeyAction[]).map(renderShortcut)}
                    <button onClick={() => onKeyMapChange(DEFAULT_KEY_MAP)} className="w-full mt-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded border border-red-400/30 transition-colors">שחזר ברירת מחדל</button>
                </div>
            </SettingsSection>
            <div className="mt-auto flex-shrink-0 pt-4">
                {isVersionHistoryVisible && <VersionHistory releaseNotes={releaseNotes} />}
                 <div className="text-center text-xs text-text-secondary space-y-2">
                    <div className={`p-2 rounded-lg ${updateStatus === 'idle' ? 'cursor-pointer hover:bg-bg-primary' : 'cursor-default'}`} onClick={updateStatus === 'idle' ? onManualUpdateCheck : undefined} role="button" tabIndex={updateStatus === 'idle' ? 0 : -1} aria-live="polite">
                        <p>רדיו פרימיום v{BUILD_INFO.version} ({BUILD_INFO.buildDate})</p>
                        <div className="h-4 mt-1 flex items-center justify-center">{getUpdateStatusContent()}</div>
                    </div>
                    <button className="text-text-secondary hover:text-text-primary opacity-80" onClick={() => setIsVersionHistoryVisible(prev => !prev)}>{isVersionHistoryVisible ? 'הסתר היסטוריית גרסאות' : 'הצג היסטוריית גרסאות'}</button>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;
