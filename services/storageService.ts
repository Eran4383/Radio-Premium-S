import { AllSettings, StationFilter, SortOrder, VisualizerStyle, GridSize, KeyMap, SettingsSections, EqPreset, CustomEqSettings, DimLevel, DimWakeMode, DeviceMode, DeviceTypeDefaults, DeviceProfile } from '../types/settings';
import { defaultSettings } from '../store/initialSettings';
import { Theme } from '../config/themes';

export function safeJsonParse<T>(jsonString: string | null, defaultValue: T): T {
    if (jsonString === null) return defaultValue;
    try {
        const parsedValue = JSON.parse(jsonString);
        return parsedValue === null ? defaultValue : parsedValue;
    } catch (e) {
        return defaultValue;
    }
}

export const saveToLocal = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const getFromLocal = <T>(key: string, defaultValue: T): T => {
    return safeJsonParse(localStorage.getItem(key), defaultValue);
};

export const saveSettingsToLocalStorage = (settings: AllSettings) => {
    saveToLocal('radio-favorites', settings.favorites);
    saveToLocal('radio-station-custom-order', settings.customOrder);
    saveToLocal('radio-theme', settings.theme);
    saveToLocal('radio-eq', settings.eqPreset);
    saveToLocal('radio-custom-eq', settings.customEqSettings);
    saveToLocal('radio-volume', settings.volume);
    saveToLocal('radio-nowplaying-visualizer-enabled', settings.isNowPlayingVisualizerEnabled);
    saveToLocal('radio-playerbar-visualizer-enabled', settings.isPlayerBarVisualizerEnabled);
    saveToLocal('radio-visualizer-style', settings.visualizerStyle);
    saveToLocal('radio-status-indicator-enabled', settings.isStatusIndicatorEnabled);
    saveToLocal('radio-volume-control-visible', settings.isVolumeControlVisible);
    saveToLocal('radio-show-next-song', settings.showNextSong);
    saveToLocal('radio-wake-lock-enabled', settings.isWakeLockEnabled);
    saveToLocal('radio-pixel-shift-enabled', settings.isPixelShiftEnabled);
    saveToLocal('radio-auto-dim-seconds', settings.autoDimSeconds);
    saveToLocal('radio-dim-level', settings.dimLevel);
    saveToLocal('radio-dim-opacity', settings.dimOpacity);
    saveToLocal('radio-dim-wake-mode', settings.dimWakeMode);
    saveToLocal('radio-emergency-timeout-minutes', settings.emergencyTimeoutMinutes);
    saveToLocal('radio-device-mode', settings.deviceMode);
    saveToLocal('radio-grid-size', settings.gridSize);
    saveToLocal('radio-marquee-program-enabled', settings.isMarqueeProgramEnabled);
    saveToLocal('radio-marquee-current-enabled', settings.isMarqueeCurrentTrackEnabled);
    saveToLocal('radio-marquee-next-enabled', settings.isMarqueeNextTrackEnabled);
    saveToLocal('radio-marquee-speed', settings.marqueeSpeed);
    saveToLocal('radio-marquee-delay', settings.marqueeDelay);
    saveToLocal('radio-last-filter', settings.filter);
    saveToLocal('radio-sort-order-all', settings.sortOrderAll);
    saveToLocal('radio-sort-order-favorites', settings.sortOrderFavorites);
    saveToLocal('radio-key-map', settings.keyMap);
    saveToLocal('radio-settings-sections', settings.settingsSections);
    saveToLocal('radio-device-type-defaults', settings.deviceTypeDefaults);
    saveToLocal('radio-device-profiles', settings.deviceProfiles);
    saveToLocal('radio-custom-avatar', settings.customAvatarUrl ?? null);
    saveToLocal('radio-custom-display-name', settings.customDisplayName ?? null);
};

export const loadSettingsFromLocalStorage = (): AllSettings => {
  const favorites = getFromLocal<string[]>('radio-favorites', defaultSettings.favorites);
  const customOrder = getFromLocal<string[]>('radio-station-custom-order', defaultSettings.customOrder);
  const theme = getFromLocal<Theme>('radio-theme', defaultSettings.theme);
  const eqPreset = getFromLocal<EqPreset>('radio-eq', defaultSettings.eqPreset);
  const customEqSettings = getFromLocal<CustomEqSettings>('radio-custom-eq', defaultSettings.customEqSettings);
  const volume = getFromLocal<number>('radio-volume', defaultSettings.volume);
  const isNowPlayingVisualizerEnabled = getFromLocal<boolean>('radio-nowplaying-visualizer-enabled', defaultSettings.isNowPlayingVisualizerEnabled);
  const isPlayerBarVisualizerEnabled = getFromLocal<boolean>('radio-playerbar-visualizer-enabled', defaultSettings.isPlayerBarVisualizerEnabled);
  const visualizerStyle = getFromLocal<VisualizerStyle>('radio-visualizer-style', defaultSettings.visualizerStyle);
  const isStatusIndicatorEnabled = getFromLocal<boolean>('radio-status-indicator-enabled', defaultSettings.isStatusIndicatorEnabled);
  const isVolumeControlVisible = getFromLocal<boolean>('radio-volume-control-visible', defaultSettings.isVolumeControlVisible);
  const showNextSong = getFromLocal<boolean>('radio-show-next-song', defaultSettings.showNextSong);
  const isWakeLockEnabled = getFromLocal<boolean>('radio-wake-lock-enabled', defaultSettings.isWakeLockEnabled);
  const isPixelShiftEnabled = getFromLocal<boolean>('radio-pixel-shift-enabled', defaultSettings.isPixelShiftEnabled);
  const autoDimSeconds = getFromLocal<number>('radio-auto-dim-seconds', defaultSettings.autoDimSeconds);
  const dimLevel = getFromLocal<DimLevel>('radio-dim-level', defaultSettings.dimLevel);
  const dimOpacity = getFromLocal<number>('radio-dim-opacity', defaultSettings.dimOpacity);
  const dimWakeMode = getFromLocal<DimWakeMode>('radio-dim-wake-mode', defaultSettings.dimWakeMode);
  const emergencyTimeoutMinutes = getFromLocal<number>('radio-emergency-timeout-minutes', defaultSettings.emergencyTimeoutMinutes);
  const deviceMode = getFromLocal<DeviceMode>('radio-device-mode', defaultSettings.deviceMode);
  const gridSize = getFromLocal<GridSize>('radio-grid-size', defaultSettings.gridSize);
  const isMarqueeProgramEnabled = getFromLocal<boolean>('radio-marquee-program-enabled', defaultSettings.isMarqueeProgramEnabled);
  const isMarqueeCurrentTrackEnabled = getFromLocal<boolean>('radio-marquee-current-enabled', defaultSettings.isMarqueeCurrentTrackEnabled);
  const isMarqueeNextTrackEnabled = getFromLocal<boolean>('radio-marquee-next-enabled', defaultSettings.isMarqueeNextTrackEnabled);
  const marqueeSpeed = getFromLocal<number>('radio-marquee-speed', defaultSettings.marqueeSpeed);
  const marqueeDelay = getFromLocal<number>('radio-marquee-delay', defaultSettings.marqueeDelay);
  const filter = getFromLocal<StationFilter>('radio-last-filter', defaultSettings.filter);
  const sortOrderAll = getFromLocal<SortOrder>('radio-sort-order-all', defaultSettings.sortOrderAll);
  const sortOrderFavorites = getFromLocal<SortOrder>('radio-sort-order-favorites', defaultSettings.sortOrderFavorites);
  const keyMap = getFromLocal<KeyMap>('radio-key-map', defaultSettings.keyMap);
  const settingsSections = getFromLocal<SettingsSections>('radio-settings-sections', defaultSettings.settingsSections);
  const deviceTypeDefaults = getFromLocal<DeviceTypeDefaults>('radio-device-type-defaults', defaultSettings.deviceTypeDefaults);
  const deviceProfiles = getFromLocal<Record<string, DeviceProfile>>('radio-device-profiles', defaultSettings.deviceProfiles);
  const customAvatarUrl = getFromLocal<string | null>('radio-custom-avatar', defaultSettings.customAvatarUrl ?? null);
  const customDisplayName = getFromLocal<string | null>('radio-custom-display-name', defaultSettings.customDisplayName ?? null);

  const sanitizedProfiles: Record<string, DeviceProfile> = {};
  for (const [id, profile] of Object.entries(deviceProfiles || {})) {
    if (!profile || typeof profile !== 'object') continue;
    const rawName = typeof profile.name === 'string' ? profile.name.trim() : '';
    sanitizedProfiles[id] = {
      ...profile,
      name: rawName.replace(/^WIN(10|11|8\.1|8|7)(_\d+)?$/, 'Win$1$2'),
    };
  }

  return {
    favorites, customOrder, theme, eqPreset, customEqSettings, volume,
    isNowPlayingVisualizerEnabled, isPlayerBarVisualizerEnabled, visualizerStyle,
    isStatusIndicatorEnabled, isVolumeControlVisible, showNextSong, isWakeLockEnabled,
    isPixelShiftEnabled, autoDimSeconds, dimLevel, dimOpacity, dimWakeMode, emergencyTimeoutMinutes,
    deviceMode, gridSize,
    isMarqueeProgramEnabled, isMarqueeCurrentTrackEnabled, isMarqueeNextTrackEnabled,
    marqueeSpeed, marqueeDelay, filter, sortOrderAll, sortOrderFavorites,
    keyMap, settingsSections,
    deviceTypeDefaults: {
      mobile: { ...defaultSettings.deviceTypeDefaults.mobile, ...(deviceTypeDefaults?.mobile || {}) },
      tablet: { ...defaultSettings.deviceTypeDefaults.tablet, ...(deviceTypeDefaults?.tablet || {}) },
      desktop: { ...defaultSettings.deviceTypeDefaults.desktop, ...(deviceTypeDefaults?.desktop || {}) },
    },
    deviceProfiles: sanitizedProfiles,
    customAvatarUrl,
    customDisplayName,
  };
};
