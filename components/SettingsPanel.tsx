import React, { useState, useEffect } from 'react';
import { Theme, EqPreset, THEMES, EQ_PRESET_KEYS, EQ_PRESET_LABELS, CustomEqSettings, GridSize, User, KeyMap, KeyAction, KEY_ACTION_LABELS, SettingsSections } from '../types';
import Auth from './Auth';
import { BUILD_INFO } from '../buildInfo';
import SettingsButton from './settings/SettingsButton';
import ToggleSwitch from './settings/ToggleSwitch';
import EqSlider from './settings/EqSlider';
import SettingsSection from './settings/SettingsSection';
import VersionHistory from './settings/VersionHistory';

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'found' | 'not-found' | 'error';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isAdmin: boolean;
  onOpenAdminPanel: () => void;
  onLogin: () => void;
  onLogout: () => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
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
  customEqSettings: CustomEqSettings;
  onCustomEqChange: (settings: CustomEqSettings) => void;
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
    isOpen, onClose, user, isAdmin, onOpenAdminPanel, onLogin, onLogout, currentTheme, onThemeChange, currentEqPreset, onEqPresetChange,
    isNowPlayingVisualizerEnabled, onNowPlayingVisualizerEnabledChange,
    isPlayerBarVisualizerEnabled, onPlayerBarVisualizerEnabledChange,
    isStatusIndicatorEnabled, onStatusIndicatorEnabledChange, isVolumeControlVisible, onVolumeControlVisibleChange,
    showNextSong, onShowNextSongChange,
    customEqSettings, onCustomEqChange,
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

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 z-30 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => { if (listeningFor) { setListeningFor(null); setIsRebinding(false); } onClose(); }}></div>
      <div className={`fixed top-0 right-0 h-full w-72 bg-bg-secondary shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h2 className="text-xl font-bold text-text-primary">הגדרות</h2>
                <Auth user={user} onLogin={onLogin} onLogout={onLogout} />
            </div>
            {isAdmin && (
                <div className="mb-6 animate-fade-in-up">
                    <button onClick={() => { onClose(); onOpenAdminPanel(); }} className="w-full bg-accent/20 hover:bg-accent/40 text-accent border border-accent/50 font-bold py-3 px-4 rounded-lg transition-all">🛠️ פאנל ניהול</button>
                </div>
            )}
            <SettingsSection title="ערכת נושא" isOpen={openSections.theme} onToggle={() => onToggleSection('theme')}>
                <div className="grid grid-cols-4 gap-2">
                    {THEMES.map(theme => <SettingsButton key={theme} label={theme} isActive={currentTheme === theme} onClick={() => onThemeChange(theme)} />)}
                </div>
            </SettingsSection>
            <SettingsSection title="אקולייזר (EQ)" isOpen={openSections.eq} onToggle={() => onToggleSection('eq')}>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {EQ_PRESET_KEYS.map(preset => <SettingsButton key={preset} label={EQ_PRESET_LABELS[preset]} isActive={currentEqPreset === preset} onClick={() => onEqPresetChange(preset)} />)}
                </div>
                 {currentEqPreset === 'custom' && (
                    <div className="p-3 rounded-lg bg-bg-primary space-y-3">
                        <EqSlider label="בס (Bass)" value={customEqSettings.bass} onChange={(val) => onCustomEqChange({ ...customEqSettings, bass: val })} />
                        <EqSlider label="אמצע (Mid)" value={customEqSettings.mid} onChange={(val) => onCustomEqChange({ ...customEqSettings, mid: val })} />
                        <EqSlider label="גבוהים (Treble)" value={customEqSettings.treble} onChange={(val) => onCustomEqChange({ ...customEqSettings, treble: val })} />
                    </div>
                )}
            </SettingsSection>
            <SettingsSection title="ממשק" isOpen={openSections.interface} onToggle={() => onToggleSection('interface')}>
                <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-bg-primary space-y-3">
                       <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm font-medium text-text-primary"><span>גודל תצוגה</span></div>
                          <div className="flex justify-between text-xs text-text-secondary px-1"><span>קטן</span><span>גדול</span></div>
                          <input type="range" min="1" max="5" step="1" value={gridSize} onChange={(e) => onGridSizeChange(parseInt(e.target.value, 10) as GridSize)} className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                       </div>
                    </div>
                    <h4 className="text-xs font-semibold text-text-secondary pt-2 px-3">טקסט נע</h4>
                    <ToggleSwitch label="שם תחנה / תוכנית" enabled={isMarqueeProgramEnabled} onChange={onMarqueeProgramEnabledChange} />
                    <ToggleSwitch label="שם שיר נוכחי" enabled={isMarqueeCurrentTrackEnabled} onChange={onMarqueeCurrentTrackEnabledChange} />
                    <ToggleSwitch label="שיר הבא" enabled={isMarqueeNextTrackEnabled} onChange={onMarqueeNextTrackEnabledChange} />
                    <div className="p-3 rounded-lg bg-bg-primary space-y-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm font-medium text-text-primary"><span>מהירות גלילה</span></div>
                          <div className="flex justify-between text-xs text-text-secondary px-1"><span>איטי</span><span>מהיר</span></div>
                          <input type="range" min="1" max="10" step="1" value={marqueeSpeed} onChange={(e) => onMarqueeSpeedChange(parseInt(e.target.value, 10))} className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-sm font-medium text-text-primary"><span>השהיה בין גלילות</span><span>{marqueeDelay} ש'</span></div>
                          <input type="range" min="1" max="10" step="1" value={marqueeDelay} onChange={(e) => onMarqueeDelayChange(parseInt(e.target.value, 10))} className="w-full accent-teal-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                    <h4 className="text-xs font-semibold text-text-secondary pt-2 px-3">כללי</h4>
                    <ToggleSwitch label="תצוגה גרפית (מסך מלא)" enabled={isNowPlayingVisualizerEnabled} onChange={onNowPlayingVisualizerEnabledChange} />
                    <ToggleSwitch label="תצוגה גרפית (נגן תחתון)" enabled={isPlayerBarVisualizerEnabled} onChange={onPlayerBarVisualizerEnabledChange} />
                    <ToggleSwitch label="הצג חיווי מצב" enabled={isStatusIndicatorEnabled} onChange={onStatusIndicatorEnabledChange} />
                    <ToggleSwitch label="הצג בקרת עוצמה" enabled={isVolumeControlVisible} onChange={onVolumeControlVisibleChange} />
                    <ToggleSwitch label="הצג שיר הבא" enabled={showNextSong} onChange={onShowNextSongChange} />
                </div>
            </SettingsSection>
            <SettingsSection title="קיצורי מקלדת" isOpen={openSections.shortcuts} onToggle={() => onToggleSection('shortcuts')}>
                <div className="space-y-2">
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
