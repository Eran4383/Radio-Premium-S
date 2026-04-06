import { AllSettings, StationFilter } from '../types/settings';

export const defaultSettings: AllSettings = {
    favorites: [], customOrder: [], theme: 'dark', eqPreset: 'flat',
    customEqSettings: { bass: 0, mid: 0, treble: 0 }, volume: 1,
    isNowPlayingVisualizerEnabled: false, isPlayerBarVisualizerEnabled: false,
    visualizerStyle: 'bars', isStatusIndicatorEnabled: true, isVolumeControlVisible: true,
    showNextSong: true, gridSize: 3, isMarqueeProgramEnabled: true,
    isMarqueeCurrentTrackEnabled: true, isMarqueeNextTrackEnabled: true,
    marqueeSpeed: 6, marqueeDelay: 3, filter: StationFilter.All, 
    sortOrderAll: 'priority',
    sortOrderFavorites: 'custom',
    keyMap: {
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
    },
    is100fmSmartPlayerEnabled: true,
    isScreenRotationEnabled: false,
    settingsSections: {
        theme: true,
        eq: true,
        interface: true,
        shortcuts: false
    }
};
