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
  const lastSyncedSettingsJsonRef = useRef<string | null>(null);
  const isCloudWriteBlockedRef = useRef(false);

  useEffect(() => {
    settingsRef.current = allSettings;
  }, [allSettings]);

  // Reset sync state when user logs out
  useEffect(() => {
    if (!user) {
      setIsInitialSyncDone(false);
      setIsCloudSyncing(false);
      lastSyncedSettingsJsonRef.current = null;
      isCloudWriteBlockedRef.current = false;
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

        if (!rawCloudSettings) {
          const initialAccountSettings = normalizeSettings(loadSettingsFromLocalStorage());
          console.log("[Sync] No cloud settings found, using local settings.");
          lastSyncedSettingsJsonRef.current = JSON.stringify(initialAccountSettings);
          setAllSettings(initialAccountSettings);

          if (!isCloudWriteBlockedRef.current) {
            const res = await saveUserSettings(user.uid, initialAccountSettings);
            if (!res.success && res.permissionDenied) {
              isCloudWriteBlockedRef.current = true;
              saveSettingsToLocalStorage(initialAccountSettings);
              console.warn("[Sync] Firestore write permission denied. Settings will be saved locally.");
            }
          }

          localStorage.setItem('radio-has-synced-with-account', 'true');
          setIsInitialSyncDone(true);
          setIsCloudSyncing(false);
          return;
        }

        const cloudSettings = normalizeSettings(rawCloudSettings);

        if (hasSyncedBefore) {
          console.log("[Sync] Loading settings from cloud, skipping conflict check.");
          lastSyncedSettingsJsonRef.current = JSON.stringify(cloudSettings);
          setAllSettings(cloudSettings);
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
              onMerge: async () => {
                console.log("[Sync] User chose to merge/keep local settings.");
                lastSyncedSettingsJsonRef.current = JSON.stringify(localSettings);
                setAllSettings(localSettings);
                const res = await saveUserSettings(user.uid, localSettings);
                if (!res.success && res.permissionDenied) {
                  isCloudWriteBlockedRef.current = true;
                  saveSettingsToLocalStorage(localSettings);
                  console.warn("[Sync] Firestore write permission denied. Settings will be saved locally.");
                }
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsInitialSyncDone(true);
                setIsCloudSyncing(false);
              },
              onDiscardLocal: () => {
                console.log("[Sync] User chose to discard local settings and use cloud.");
                lastSyncedSettingsJsonRef.current = JSON.stringify(cloudSettings);
                setAllSettings(cloudSettings);
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsInitialSyncDone(true);
                setIsCloudSyncing(false);
              },
            });
          } else {
            console.log("[Sync] No conflicts found. Using cloud settings.");
            lastSyncedSettingsJsonRef.current = JSON.stringify(cloudSettings);
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
    if (!user) {
      saveSettingsToLocalStorage(allSettings);
      return;
    }
    
    // Cloud persistence ONLY runs if we are logged in AND the initial sync is finished AND we aren't currently syncing
    if (isInitialSyncDone && !isCloudSyncing) {
      const serialized = JSON.stringify(allSettings);
      if (serialized === lastSyncedSettingsJsonRef.current) {
        return;
      }
      lastSyncedSettingsJsonRef.current = serialized;

      if (isCloudWriteBlockedRef.current) {
        saveSettingsToLocalStorage(allSettings);
        return;
      }

      saveUserSettings(user.uid, allSettings).then((res) => {
        if (!res.success) {
          saveSettingsToLocalStorage(allSettings);
          if (res.permissionDenied && !isCloudWriteBlockedRef.current) {
            isCloudWriteBlockedRef.current = true;
            console.warn("[Sync] Firestore write permission denied. Falling back to local storage for this session.");
          }
        }
      });
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
