import { useState, useEffect, useRef, useCallback } from 'react';
import { AllSettings, SettingsSections } from '../types/settings';
import { User } from '../types/user';
import { defaultSettings } from '../store/initialSettings';
import { 
  saveUserSettings, 
  getUserSettings, 
  settingsHaveConflict, 
  normalizeSettings 
} from '../services/settingsService';
import { 
  loadSettingsFromLocalStorage, 
  saveSettingsToLocalStorage 
} from '../services/storageService';

export const useSettings = (user: User | null, isAuthReady: boolean) => {
  const [allSettings, setAllSettings] = useState<AllSettings>(() => loadSettingsFromLocalStorage());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'found' | 'not-found' | 'error'>('idle');
  const [mergeModal, setMergeModal] = useState({ 
    isOpen: false, 
    onMerge: () => {}, 
    onDiscardLocal: () => {} 
  });

  const settingsRef = useRef(allSettings);
  useEffect(() => {
    settingsRef.current = allSettings;
  }, [allSettings]);

  // Cloud Sync Logic
  useEffect(() => {
    if (!isAuthReady) return;

    const syncSettings = async () => {
      if (user) {
        setIsCloudSyncing(true);
        const hasSyncedBefore = localStorage.getItem('radio-has-synced-with-account') === 'true';
        const rawCloudSettings = await getUserSettings(user.uid);
        const cloudSettings = normalizeSettings(rawCloudSettings);

        if (hasSyncedBefore || !rawCloudSettings) {
          setAllSettings(cloudSettings);
          if (!rawCloudSettings) {
            await saveUserSettings(user.uid, cloudSettings);
          }
          localStorage.setItem('radio-has-synced-with-account', 'true');
          setIsCloudSyncing(false);
        } else {
          const localSettings = settingsRef.current;
          if (settingsHaveConflict(localSettings, cloudSettings)) {
            setMergeModal({
              isOpen: true,
              onMerge: () => {
                setAllSettings(localSettings);
                saveUserSettings(user.uid, localSettings);
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsCloudSyncing(false);
              },
              onDiscardLocal: () => {
                setAllSettings(cloudSettings);
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsCloudSyncing(false);
              },
            });
          } else {
            setAllSettings(cloudSettings);
            localStorage.setItem('radio-has-synced-with-account', 'true');
            setIsCloudSyncing(false);
          }
        }
      } else {
        localStorage.removeItem('radio-has-synced-with-account');
        setAllSettings(loadSettingsFromLocalStorage());
      }
    };

    syncSettings();
  }, [user, isAuthReady]);

  // Persistence
  useEffect(() => {
    if (!user) {
      saveSettingsToLocalStorage(allSettings);
    }
    if (user && !isCloudSyncing) {
      saveUserSettings(user.uid, allSettings);
    }
  }, [allSettings, user, isCloudSyncing]);

  const updateSettings = (updater: (prev: AllSettings) => AllSettings) => {
    setAllSettings(updater);
  };

  const handleToggleSettingsSection = (section: keyof SettingsSections) => {
    setAllSettings(prev => ({
      ...prev,
      settingsSections: {
        ...prev.settingsSections,
        [section]: !prev.settingsSections[section]
      }
    }));
  };

  const handleManualUpdateCheck = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.ready) {
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
      return;
    }
    setUpdateStatus('checking');
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      setTimeout(() => {
        setUpdateStatus(cs => cs === 'checking' ? 'not-found' : cs);
        if (updateStatus === 'not-found') setTimeout(() => setUpdateStatus('idle'), 3000);
      }, 5000);
    } catch (error) {
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  }, [updateStatus]);

  return {
    allSettings,
    setAllSettings,
    updateSettings,
    isCloudSyncing,
    mergeModal,
    setMergeModal,
    handleToggleSettingsSection,
    updateStatus,
    handleManualUpdateCheck
  };
};
