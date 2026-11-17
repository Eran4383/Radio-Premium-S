import { useEffect } from 'react';
import { AllSettings, EqPreset, KeyAction } from '../types/settings';

interface KeyboardShortcutsProps {
  allSettings: AllSettings;
  isRebinding: boolean;
  handlePlayPause: () => void;
  handleNext: () => void;
  handlePrev: () => void;
  setAllSettings: React.Dispatch<React.SetStateAction<AllSettings>>;
  onEqPresetChange?: (preset: EqPreset) => void;
  preMuteVolume: number;
  setPreMuteVolume: React.Dispatch<React.SetStateAction<number>>;
}

export const useKeyboardShortcuts = ({
  allSettings,
  isRebinding,
  handlePlayPause,
  handleNext,
  handlePrev,
  setAllSettings,
  onEqPresetChange,
  preMuteVolume,
  setPreMuteVolume
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRebinding) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const { key } = e;
      let action: KeyAction | undefined;
      
      for (const [act, keys] of Object.entries(allSettings.keyMap) as [string, string[]][]) {
        if (keys.includes(key)) {
          action = act as KeyAction;
          break;
        }
      }

      if (action) {
        e.preventDefault();
        switch (action) {
          case 'playPause': handlePlayPause(); break;
          case 'volumeUp': 
            setAllSettings(s => ({...s, volume: Math.round(Math.min(1, s.volume + 0.01) * 100) / 100})); 
            break;
          case 'volumeDown': 
            setAllSettings(s => ({...s, volume: Math.round(Math.max(0, s.volume - 0.01) * 100) / 100})); 
            break;
          case 'toggleMute':
            if (allSettings.volume > 0) {
              setPreMuteVolume(allSettings.volume);
              setAllSettings(s => ({...s, volume: 0}));
            } else {
              setAllSettings(s => ({...s, volume: preMuteVolume || 0.5}));
            }
            break;
          case 'nextStation': handleNext(); break;
          case 'prevStation': handlePrev(); break;
          case 'toggleFullscreen':
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(console.error);
            } else {
              document.exitFullscreen().catch(console.error);
            }
            break;
          case 'eqFlat': onEqPresetChange ? onEqPresetChange('flat') : setAllSettings(s => ({...s, eqPreset: 'flat'})); break;
          case 'eqBassBoost': onEqPresetChange ? onEqPresetChange('bassBoost') : setAllSettings(s => ({...s, eqPreset: 'bassBoost'})); break;
          case 'eqVocalBoost': onEqPresetChange ? onEqPresetChange('vocalBoost') : setAllSettings(s => ({...s, eqPreset: 'vocalBoost'})); break;
          case 'eqRock': onEqPresetChange ? onEqPresetChange('rock') : setAllSettings(s => ({...s, eqPreset: 'rock'})); break;
          case 'eqMovie': onEqPresetChange ? onEqPresetChange('movie') : setAllSettings(s => ({...s, eqPreset: 'movie'})); break;
          case 'eqCustom': onEqPresetChange ? onEqPresetChange('custom') : setAllSettings(s => ({...s, eqPreset: 'custom'})); break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allSettings.keyMap, allSettings.volume, handlePlayPause, handleNext, handlePrev, preMuteVolume, isRebinding, setAllSettings, onEqPresetChange, setPreMuteVolume]);
};
