import { AllSettings, StationFilter, SortOrder, VisualizerStyle, GridSize, KeyMap, SettingsSections, EqPreset, CustomEqSettings } from '../types/settings';
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
    saveToLocal('radio-100fm-smart-player-enabled', settings.is100fmSmartPlayerEnabled);
    saveToLocal('radio-bluetooth-action', settings.bluetoothAction);
    saveToLocal('radio-screen-rotation-enabled', settings.isScreenRotationEnabled);
    saveToLocal('radio-settings-sections', settings.settingsSections);
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
  const is100fmSmartPlayerEnabled = getFromLocal<boolean>('radio-100fm-smart-player-enabled', defaultSettings.is100fmSmartPlayerEnabled);
  const bluetoothAction = getFromLocal<'station' | 'track'>('radio-bluetooth-action', defaultSettings.bluetoothAction);
  const isScreenRotationEnabled = getFromLocal<boolean>('radio-screen-rotation-enabled', defaultSettings.isScreenRotationEnabled);
  const settingsSections = getFromLocal<SettingsSections>('radio-settings-sections', defaultSettings.settingsSections);

  return {
    favorites, customOrder, theme, eqPreset, customEqSettings, volume,
    isNowPlayingVisualizerEnabled, isPlayerBarVisualizerEnabled, visualizerStyle,
    isStatusIndicatorEnabled, isVolumeControlVisible, showNextSong, gridSize,
    isMarqueeProgramEnabled, isMarqueeCurrentTrackEnabled, isMarqueeNextTrackEnabled,
    marqueeSpeed, marqueeDelay, filter, sortOrderAll, sortOrderFavorites,
    keyMap, is100fmSmartPlayerEnabled, bluetoothAction, isScreenRotationEnabled, settingsSections
  };
};
