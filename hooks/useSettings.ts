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
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
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

  // Reset sync state when user logs out
  useEffect(() => {
    if (!user) {
      setIsInitialSyncDone(false);
      setIsCloudSyncing(false);
    }
  }, [user]);

  // Cloud Sync Logic
  useEffect(() => {
    if (!isAuthReady) return;

    const syncSettings = async () => {
      if (user) {
        // If we already did the initial sync for this user, don't do it again
        if (isInitialSyncDone) return;

        setIsCloudSyncing(true);
        console.log(`[Sync] Starting sync for user: ${user.email} (${user.uid})`);
        
        const hasSyncedBefore = localStorage.getItem('radio-has-synced-with-account') === 'true';
        const rawCloudSettings = await getUserSettings(user.uid);
        const cloudSettings = normalizeSettings(rawCloudSettings);

        if (hasSyncedBefore || !rawCloudSettings) {
          console.log("[Sync] Loading settings from cloud, skipping conflict check.");
          setAllSettings(cloudSettings);
          if (!rawCloudSettings) {
            console.log("[Sync] No cloud settings found, creating initial document.");
            await saveUserSettings(user.uid, cloudSettings);
          }
          localStorage.setItem('radio-has-synced-with-account', 'true');
          setIsInitialSyncDone(true);
          setIsCloudSyncing(false);
        } else {
          const localSettings = settingsRef.current;
          console.log("[Sync] Comparing settings for conflict...");
          
          if (settingsHaveConflict(localSettings, cloudSettings)) {
            console.log("[Sync] Conflict detected. Opening merge modal.");
            setMergeModal({
              isOpen: true,
              onMerge: () => {
                console.log("[Sync] User chose to merge/keep local settings.");
                setAllSettings(localSettings);
                saveUserSettings(user.uid, localSettings);
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsInitialSyncDone(true);
                setIsCloudSyncing(false);
              },
              onDiscardLocal: () => {
                console.log("[Sync] User chose to discard local settings and use cloud.");
                setAllSettings(cloudSettings);
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsInitialSyncDone(true);
                setIsCloudSyncing(false);
              },
            });
          } else {
            console.log("[Sync] No conflicts found. Using cloud settings.");
            setAllSettings(cloudSettings);
            localStorage.setItem('radio-has-synced-with-account', 'true');
            setIsInitialSyncDone(true);
            setIsCloudSyncing(false);
          }
        }
      } else {
        localStorage.removeItem('radio-has-synced-with-account');
        setAllSettings(loadSettingsFromLocalStorage());
      }
    };

    syncSettings();
  }, [user, isAuthReady, isInitialSyncDone]);

  // Persistence
  useEffect(() => {
    // Local persistence always runs
    if (!user) {
      saveSettingsToLocalStorage(allSettings);
    }
    
    // Cloud persistence ONLY runs if we are logged in AND the initial sync is finished AND we aren't currently syncing
    if (user && isInitialSyncDone && !isCloudSyncing) {
      saveUserSettings(user.uid, allSettings);
    }
  }, [allSettings, user, isCloudSyncing, isInitialSyncDone]);

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
