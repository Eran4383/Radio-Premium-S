import React, { useState, useEffect } from 'react';
import { THEMES, EQ_PRESET_KEYS, EQ_PRESET_LABELS, KEY_ACTION_LABELS } from '../types';
import Auth from './Auth';
import { BUILD_INFO } from '../buildInfo';
import SettingsButton from './settings/SettingsButton';
import ToggleSwitch from './settings/ToggleSwitch';
import EqSlider from './settings/EqSlider';
import SettingsSection from './settings/SettingsSection';
import VersionHistory from './settings/VersionHistory';
const releaseNotes = [
    {
        version: '1.2',
        date: '08.12.2025',
        features: [
            "חדש: נגן חכם לתחנות 100FM המאפשר חזרה בזמן ומעבר בין שירים.",
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
const DEFAULT_KEY_MAP = {
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
const SettingsPanel = ({ isOpen, onClose, user, isAdmin, onOpenAdminPanel, onLogin, onLogout, currentTheme, onThemeChange, currentEqPreset, onEqPresetChange, isNowPlayingVisualizerEnabled, onNowPlayingVisualizerEnabledChange, isPlayerBarVisualizerEnabled, onPlayerBarVisualizerEnabledChange, isStatusIndicatorEnabled, onStatusIndicatorEnabledChange, isVolumeControlVisible, onVolumeControlVisibleChange, showNextSong, onShowNextSongChange, isScreenRotationEnabled, onScreenRotationEnabledChange, customEqSettings, onCustomEqChange, gridSize, onGridSizeChange, isMarqueeProgramEnabled, onMarqueeProgramEnabledChange, isMarqueeCurrentTrackEnabled, onMarqueeCurrentTrackEnabledChange, isMarqueeNextTrackEnabled, onMarqueeNextTrackEnabledChange, marqueeSpeed, onMarqueeSpeedChange, marqueeDelay, onMarqueeDelayChange, updateStatus, onManualUpdateCheck, keyMap, onKeyMapChange, setIsRebinding, is100fmSmartPlayerEnabled, on100fmSmartPlayerEnabledChange, openSections, onToggleSection, isCloudSyncing, onForcePush, onForcePull }) => {
    const [isVersionHistoryVisible, setIsVersionHistoryVisible] = useState(false);
    const [listeningFor, setListeningFor] = useState(null);
    useEffect(() => {
        if (!listeningFor)
            return;
        const handleRebind = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            if (e.key === 'Escape') {
                setListeningFor(null);
                setIsRebinding(false);
                return;
            }
            onKeyMapChange({ ...keyMap, [listeningFor]: [e.key] });
            setListeningFor(null);
            setIsRebinding(false);
        };
        window.addEventListener('keydown', handleRebind, { capture: true });
        return () => window.removeEventListener('keydown', handleRebind, { capture: true });
    }, [listeningFor, keyMap, onKeyMapChange, setIsRebinding]);
    const handleStartRebind = (action) => { setListeningFor(action); setIsRebinding(true); };
    const handleCancelRebind = (e) => { e.stopPropagation(); setListeningFor(null); setIsRebinding(false); };
    const getUpdateStatusContent = () => {
        switch (updateStatus) {
            case 'checking': return 'בודק עדכונים...';
            case 'downloading': return 'מוריד עדכון...';
            case 'found': return 'העדכון מוכן להתקנה!';
            case 'not-found': return 'הגרסה עדכנית';
            case 'error': return 'שגיאה בבדיקה';
            default: return React.createElement("span", { className: "opacity-70" }, "\u05DC\u05D7\u05E5 \u05DC\u05D1\u05D3\u05D9\u05E7\u05EA \u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD");
        }
    };
    const renderShortcut = (action) => (React.createElement("div", { key: action, className: "flex justify-between items-center p-2 bg-bg-primary rounded-lg" },
        React.createElement("span", { className: "text-sm" }, KEY_ACTION_LABELS[action]),
        React.createElement("div", { className: "flex items-center gap-2" },
            listeningFor === action && (React.createElement("button", { onClick: handleCancelRebind, className: "text-red-400 hover:text-red-300 font-bold px-2", title: "\u05D1\u05D9\u05D8\u05D5\u05DC" }, "\u2715")),
            React.createElement("button", { onClick: () => handleStartRebind(action), className: `px-3 py-1 text-xs rounded border transition-all ${listeningFor === action ? 'bg-accent text-white border-accent animate-pulse' : 'bg-bg-secondary border-gray-600 text-text-secondary hover:border-text-primary'}` }, listeningFor === action ? 'לחץ על מקש...' : keyMap[action][0].toUpperCase().replace(' ', 'Space')))));
    return (React.createElement(React.Fragment, null,
        React.createElement("div", { className: `fixed inset-0 bg-black/60 z-30 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`, onClick: () => { if (listeningFor) {
                setListeningFor(null);
                setIsRebinding(false);
            } onClose(); } }),
        React.createElement("div", { className: `fixed top-0 right-0 h-full w-72 bg-bg-secondary shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}` },
            React.createElement("div", { className: "p-4 flex flex-col h-full overflow-y-auto" },
                React.createElement("div", { className: "flex justify-between items-center mb-6 flex-shrink-0" },
                    React.createElement("h2", { className: "text-xl font-bold text-text-primary" }, "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA"),
                    React.createElement(Auth, { user: user, onLogin: onLogin, onLogout: onLogout })),
                isAdmin && (React.createElement("div", { className: "mb-6 animate-fade-in-up" },
                    React.createElement("button", { onClick: () => { onClose(); onOpenAdminPanel(); }, className: "w-full bg-accent/20 hover:bg-accent/40 text-accent border border-accent/50 font-bold py-3 px-4 rounded-lg transition-all" }, "\uD83D\uDEE0\uFE0F \u05E4\u05D0\u05E0\u05DC \u05E0\u05D9\u05D4\u05D5\u05DC"))),
                React.createElement(SettingsSection, { title: "\u05E2\u05E8\u05DB\u05EA \u05E0\u05D5\u05E9\u05D0", isOpen: openSections.theme, onToggle: () => onToggleSection('theme') },
                    React.createElement("div", { className: "grid grid-cols-4 gap-2" }, THEMES.map(theme => React.createElement(SettingsButton, { key: theme, label: theme, isActive: currentTheme === theme, onClick: () => onThemeChange(theme) })))),
                React.createElement(SettingsSection, { title: "\u05D0\u05E7\u05D5\u05DC\u05D9\u05D9\u05D6\u05E8 (EQ)", isOpen: openSections.eq, onToggle: () => onToggleSection('eq') },
                    React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" }, EQ_PRESET_KEYS.map(preset => React.createElement(SettingsButton, { key: preset, label: EQ_PRESET_LABELS[preset], isActive: currentEqPreset === preset, onClick: () => onEqPresetChange(preset) }))),
                    currentEqPreset === 'custom' && (React.createElement("div", { className: "p-3 rounded-lg bg-bg-primary space-y-3" },
                        React.createElement(EqSlider, { label: "\u05D1\u05E1 (Bass)", value: customEqSettings.bass, onChange: (val) => onCustomEqChange({ ...customEqSettings, bass: val }) }),
                        React.createElement(EqSlider, { label: "\u05D0\u05DE\u05E6\u05E2 (Mid)", value: customEqSettings.mid, onChange: (val) => onCustomEqChange({ ...customEqSettings, mid: val }) }),
                        React.createElement(EqSlider, { label: "\u05D2\u05D1\u05D5\u05D4\u05D9\u05DD (Treble)", value: customEqSettings.treble, onChange: (val) => onCustomEqChange({ ...customEqSettings, treble: val }) })))),
                React.createElement(SettingsSection, { title: "\u05DE\u05DE\u05E9\u05E7", isOpen: openSections.interface, onToggle: () => onToggleSection('interface') },
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement("div", { className: "p-3 rounded-lg bg-bg-primary space-y-3" },
                            React.createElement("div", { className: "flex flex-col gap-1" },
                                React.createElement("div", { className: "flex justify-between text-sm font-medium text-text-primary" },
                                    React.createElement("span", null, "\u05D2\u05D5\u05D3\u05DC \u05EA\u05E6\u05D5\u05D2\u05D4")),
                                React.createElement("div", { className: "flex justify-between text-xs text-text-secondary px-1" },
                                    React.createElement("span", null, "\u05E7\u05D8\u05DF"),
                                    React.createElement("span", null, "\u05D2\u05D3\u05D5\u05DC")),
                                React.createElement("input", { type: "range", min: "1", max: "5", step: "1", value: gridSize, onChange: (e) => onGridSizeChange(parseInt(e.target.value, 10)), className: "w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" }))),
                        React.createElement("h4", { className: "text-xs font-semibold text-text-secondary pt-2 px-3" }, "\u05D8\u05E7\u05E1\u05D8 \u05E0\u05E2"),
                        React.createElement(ToggleSwitch, { label: "\u05E9\u05DD \u05EA\u05D7\u05E0\u05D4 / \u05EA\u05D5\u05DB\u05E0\u05D9\u05EA", enabled: isMarqueeProgramEnabled, onChange: onMarqueeProgramEnabledChange }),
                        React.createElement(ToggleSwitch, { label: "\u05E9\u05DD \u05E9\u05D9\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D9", enabled: isMarqueeCurrentTrackEnabled, onChange: onMarqueeCurrentTrackEnabledChange }),
                        React.createElement(ToggleSwitch, { label: "\u05E9\u05D9\u05E8 \u05D4\u05D1\u05D0", enabled: isMarqueeNextTrackEnabled, onChange: onMarqueeNextTrackEnabledChange }),
                        React.createElement("div", { className: "p-3 rounded-lg bg-bg-primary space-y-3" },
                            React.createElement("div", { className: "flex flex-col gap-1" },
                                React.createElement("div", { className: "flex justify-between text-sm font-medium text-text-primary" },
                                    React.createElement("span", null, "\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D2\u05DC\u05D9\u05DC\u05D4")),
                                React.createElement("div", { className: "flex justify-between text-xs text-text-secondary px-1" },
                                    React.createElement("span", null, "\u05D0\u05D9\u05D8\u05D9"),
                                    React.createElement("span", null, "\u05DE\u05D4\u05D9\u05E8")),
                                React.createElement("input", { type: "range", min: "1", max: "10", step: "1", value: marqueeSpeed, onChange: (e) => onMarqueeSpeedChange(parseInt(e.target.value, 10)), className: "w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" })),
                            React.createElement("div", { className: "flex flex-col gap-1" },
                                React.createElement("div", { className: "flex justify-between text-sm font-medium text-text-primary" },
                                    React.createElement("span", null, "\u05D4\u05E9\u05D4\u05D9\u05D4 \u05D1\u05D9\u05DF \u05D2\u05DC\u05D9\u05DC\u05D5\u05EA"),
                                    React.createElement("span", null,
                                        marqueeDelay,
                                        " \u05E9'")),
                                React.createElement("input", { type: "range", min: "1", max: "10", step: "1", value: marqueeDelay, onChange: (e) => onMarqueeDelayChange(parseInt(e.target.value, 10)), className: "w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" }))),
                        React.createElement("h4", { className: "text-xs font-semibold text-text-secondary pt-2 px-3" }, "\u05DB\u05DC\u05DC\u05D9"),
                        React.createElement(ToggleSwitch, { label: "\u05E0\u05D2\u05DF \u05D7\u05DB\u05DD (100FM)", enabled: is100fmSmartPlayerEnabled, onChange: on100fmSmartPlayerEnabledChange }),
                        React.createElement(ToggleSwitch, { label: "\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D2\u05E8\u05E4\u05D9\u05EA (\u05DE\u05E1\u05DA \u05DE\u05DC\u05D0)", enabled: isNowPlayingVisualizerEnabled, onChange: onNowPlayingVisualizerEnabledChange }),
                        React.createElement(ToggleSwitch, { label: "\u05EA\u05E6\u05D5\u05D2\u05D4 \u05D2\u05E8\u05E4\u05D9\u05EA (\u05E0\u05D2\u05DF \u05EA\u05D7\u05EA\u05D5\u05DF)", enabled: isPlayerBarVisualizerEnabled, onChange: onPlayerBarVisualizerEnabledChange }),
                        React.createElement(ToggleSwitch, { label: "\u05D4\u05E6\u05D2 \u05D7\u05D9\u05D5\u05D5\u05D9 \u05DE\u05E6\u05D1", enabled: isStatusIndicatorEnabled, onChange: onStatusIndicatorEnabledChange }),
                        React.createElement(ToggleSwitch, { label: "\u05D4\u05E6\u05D2 \u05D1\u05E7\u05E8\u05EA \u05E2\u05D5\u05E6\u05DE\u05D4", enabled: isVolumeControlVisible, onChange: onVolumeControlVisibleChange }),
                        React.createElement(ToggleSwitch, { label: "\u05D4\u05E6\u05D2 \u05E9\u05D9\u05E8 \u05D4\u05D1\u05D0", enabled: showNextSong, onChange: onShowNextSongChange }),
                        React.createElement(ToggleSwitch, { label: "\u05D0\u05E4\u05E9\u05E8 \u05E1\u05D9\u05D1\u05D5\u05D1 \u05DE\u05E1\u05DA", enabled: isScreenRotationEnabled, onChange: onScreenRotationEnabledChange }))),
                user && (React.createElement(SettingsSection, { title: "\u05E1\u05E0\u05DB\u05E8\u05D5\u05DF \u05E2\u05E0\u05DF", isOpen: openSections.sync, onToggle: () => onToggleSection('sync') },
                    React.createElement("div", { className: "space-y-3 p-1" },
                        React.createElement("p", { className: "text-[10px] text-text-secondary leading-tight mb-2" }, "\u05D0\u05DD \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DC\u05D0 \u05DE\u05E1\u05EA\u05E0\u05DB\u05E8\u05E0\u05D9\u05DD \u05D0\u05D5 \u05E9\u05D0\u05EA\u05D4 \u05E8\u05D5\u05E6\u05D4 \u05DC\u05D2\u05D1\u05D5\u05EA \u05D9\u05D3\u05E0\u05D9\u05EA \u05D0\u05EA \u05D4\u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05E9\u05DC\u05DA \u05DC\u05E2\u05E0\u05DF."),
                        React.createElement("button", { onClick: onForcePush, disabled: isCloudSyncing, className: "w-full py-2 px-3 text-xs bg-bg-primary hover:bg-accent/10 border border-gray-700 hover:border-accent/50 rounded-lg flex items-center justify-between transition-all disabled:opacity-50" },
                            React.createElement("span", null, "\u05D3\u05D7\u05D5\u05E3 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DC\u05E2\u05E0\u05DF"),
                            React.createElement("span", null, isCloudSyncing ? '⏳' : '📤')),
                        React.createElement("button", { onClick: onForcePull, disabled: isCloudSyncing, className: "w-full py-2 px-3 text-xs bg-bg-primary hover:bg-accent/10 border border-gray-700 hover:border-accent/50 rounded-lg flex items-center justify-between transition-all disabled:opacity-50" },
                            React.createElement("span", null, "\u05DE\u05E9\u05D5\u05DA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DE\u05D4\u05E2\u05E0\u05DF"),
                            React.createElement("span", null, isCloudSyncing ? '⏳' : '📥')),
                        isCloudSyncing && React.createElement("p", { className: "text-[10px] text-accent animate-pulse text-center" }, "\u05DE\u05E1\u05EA\u05E0\u05DB\u05E8\u05DF...")))),
                React.createElement(SettingsSection, { title: "\u05E7\u05D9\u05E6\u05D5\u05E8\u05D9 \u05DE\u05E7\u05DC\u05D3\u05EA", isOpen: openSections.shortcuts, onToggle: () => onToggleSection('shortcuts') },
                    React.createElement("div", { className: "space-y-2" },
                        React.createElement("h4", { className: "text-xs font-semibold text-text-secondary pt-1 px-1" }, "\u05DB\u05DC\u05DC\u05D9"),
                        ['playPause', 'volumeUp', 'volumeDown', 'toggleMute', 'nextStation', 'prevStation', 'toggleFullscreen'].map(renderShortcut),
                        React.createElement("h4", { className: "text-xs font-semibold text-text-secondary pt-3 px-1" }, "\u05D0\u05E7\u05D5\u05DC\u05D9\u05D9\u05D6\u05E8"),
                        ['eqFlat', 'eqBassBoost', 'eqVocalBoost', 'eqRock', 'eqMovie', 'eqCustom'].map(renderShortcut),
                        React.createElement("button", { onClick: () => onKeyMapChange(DEFAULT_KEY_MAP), className: "w-full mt-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded border border-red-400/30 transition-colors" }, "\u05E9\u05D7\u05D6\u05E8 \u05D1\u05E8\u05D9\u05E8\u05EA \u05DE\u05D7\u05D3\u05DC"))),
                React.createElement("div", { className: "mt-auto flex-shrink-0 pt-4" },
                    isVersionHistoryVisible && React.createElement(VersionHistory, { releaseNotes: releaseNotes }),
                    React.createElement("div", { className: "text-center text-xs text-text-secondary space-y-2" },
                        React.createElement("div", { className: `p-2 rounded-lg ${updateStatus === 'idle' ? 'cursor-pointer hover:bg-bg-primary' : 'cursor-default'}`, onClick: updateStatus === 'idle' ? onManualUpdateCheck : undefined, role: "button", tabIndex: updateStatus === 'idle' ? 0 : -1, "aria-live": "polite" },
                            React.createElement("p", null,
                                "\u05E8\u05D3\u05D9\u05D5 \u05E4\u05E8\u05D9\u05DE\u05D9\u05D5\u05DD v",
                                BUILD_INFO.version,
                                " (",
                                BUILD_INFO.buildDate,
                                ")"),
                            React.createElement("div", { className: "h-4 mt-1 flex items-center justify-center" }, getUpdateStatusContent())),
                        React.createElement("button", { className: "text-text-secondary hover:text-text-primary opacity-80", onClick: () => setIsVersionHistoryVisible(prev => !prev) }, isVersionHistoryVisible ? 'הסתר היסטוריית גרסאות' : 'הצג היסטוריית גרסאות')))))));
};
export default SettingsPanel;
