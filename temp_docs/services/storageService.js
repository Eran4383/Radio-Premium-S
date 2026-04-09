import { defaultSettings } from '../store/initialSettings';
export function safeJsonParse(jsonString, defaultValue) {
    if (jsonString === null)
        return defaultValue;
    try {
        const parsedValue = JSON.parse(jsonString);
        return parsedValue === null ? defaultValue : parsedValue;
    }
    catch (e) {
        return defaultValue;
    }
}
export const saveToLocal = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};
export const getFromLocal = (key, defaultValue) => {
    return safeJsonParse(localStorage.getItem(key), defaultValue);
};
export const saveSettingsToLocalStorage = (settings) => {
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
    saveToLocal('radio-screen-rotation-enabled', settings.isScreenRotationEnabled);
    saveToLocal('radio-settings-sections', settings.settingsSections);
};
export const loadSettingsFromLocalStorage = () => {
    const favorites = getFromLocal('radio-favorites', defaultSettings.favorites);
    const customOrder = getFromLocal('radio-station-custom-order', defaultSettings.customOrder);
    const theme = getFromLocal('radio-theme', defaultSettings.theme);
    const eqPreset = getFromLocal('radio-eq', defaultSettings.eqPreset);
    const customEqSettings = getFromLocal('radio-custom-eq', defaultSettings.customEqSettings);
    const volume = getFromLocal('radio-volume', defaultSettings.volume);
    const isNowPlayingVisualizerEnabled = getFromLocal('radio-nowplaying-visualizer-enabled', defaultSettings.isNowPlayingVisualizerEnabled);
    const isPlayerBarVisualizerEnabled = getFromLocal('radio-playerbar-visualizer-enabled', defaultSettings.isPlayerBarVisualizerEnabled);
    const visualizerStyle = getFromLocal('radio-visualizer-style', defaultSettings.visualizerStyle);
    const isStatusIndicatorEnabled = getFromLocal('radio-status-indicator-enabled', defaultSettings.isStatusIndicatorEnabled);
    const isVolumeControlVisible = getFromLocal('radio-volume-control-visible', defaultSettings.isVolumeControlVisible);
    const showNextSong = getFromLocal('radio-show-next-song', defaultSettings.showNextSong);
    const gridSize = getFromLocal('radio-grid-size', defaultSettings.gridSize);
    const isMarqueeProgramEnabled = getFromLocal('radio-marquee-program-enabled', defaultSettings.isMarqueeProgramEnabled);
    const isMarqueeCurrentTrackEnabled = getFromLocal('radio-marquee-current-enabled', defaultSettings.isMarqueeCurrentTrackEnabled);
    const isMarqueeNextTrackEnabled = getFromLocal('radio-marquee-next-enabled', defaultSettings.isMarqueeNextTrackEnabled);
    const marqueeSpeed = getFromLocal('radio-marquee-speed', defaultSettings.marqueeSpeed);
    const marqueeDelay = getFromLocal('radio-marquee-delay', defaultSettings.marqueeDelay);
    const filter = getFromLocal('radio-last-filter', defaultSettings.filter);
    const sortOrderAll = getFromLocal('radio-sort-order-all', defaultSettings.sortOrderAll);
    const sortOrderFavorites = getFromLocal('radio-sort-order-favorites', defaultSettings.sortOrderFavorites);
    const keyMap = getFromLocal('radio-key-map', defaultSettings.keyMap);
    const is100fmSmartPlayerEnabled = getFromLocal('radio-100fm-smart-player-enabled', defaultSettings.is100fmSmartPlayerEnabled);
    const isScreenRotationEnabled = getFromLocal('radio-screen-rotation-enabled', defaultSettings.isScreenRotationEnabled);
    const settingsSections = getFromLocal('radio-settings-sections', defaultSettings.settingsSections);
    return {
        favorites, customOrder, theme, eqPreset, customEqSettings, volume,
        isNowPlayingVisualizerEnabled, isPlayerBarVisualizerEnabled, visualizerStyle,
        isStatusIndicatorEnabled, isVolumeControlVisible, showNextSong, gridSize,
        isMarqueeProgramEnabled, isMarqueeCurrentTrackEnabled, isMarqueeNextTrackEnabled,
        marqueeSpeed, marqueeDelay, filter, sortOrderAll, sortOrderFavorites,
        keyMap, is100fmSmartPlayerEnabled, isScreenRotationEnabled, settingsSections
    };
};
