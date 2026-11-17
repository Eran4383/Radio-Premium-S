import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AllSettings,
  DetectedDeviceType,
  DeviceProfile,
  DeviceScopedSettingKey,
  DeviceScopedSettings,
  SettingsEditScope,
  SettingsSections,
} from '../types/settings';
import { User } from '../types/user';
import {
  saveUserSettings,
  getUserSettings,
  settingsHaveConflict,
  normalizeSettings,
} from '../services/settingsService';
import {
  loadSettingsFromLocalStorage,
  saveSettingsToLocalStorage,
} from '../services/storageService';
import {
  applyScopedUpdate,
  collectDeviceSignature,
  createDefaultDeviceName,
  detectFriendlyDeviceModelAsync,
  extractCustomOverridesForMigration,
  generateDeviceId,
  getStoredDeviceIdSync,
  isBrokenOrLegacyDeviceName,
  persistActiveDeviceId,
  rankRecoveryCandidates,
  recoverDeviceIdFromIndexedDB,
  resetAllDeviceOverrides,
  resetDeviceOverrideKey,
} from '../services/deviceProfileService';

export interface DeviceRecoveryModalState {
  isOpen: boolean;
  candidates: { profile: DeviceProfile; score: number }[];
  suggestedName: string;
}

export const useSettings = (
  user: User | null,
  isAuthReady: boolean,
  detectedDevice: DetectedDeviceType
) => {
  const [allSettings, setAllSettings] = useState<AllSettings>(() => loadSettingsFromLocalStorage());
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(() => getStoredDeviceIdSync());
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'found' | 'not-found' | 'error'>('idle');
  const [mergeModal, setMergeModal] = useState({
    isOpen: false,
    onMerge: () => {},
    onDiscardLocal: () => {},
  });
  const [deviceRecoveryModal, setDeviceRecoveryModal] = useState<DeviceRecoveryModalState>({
    isOpen: false,
    candidates: [],
    suggestedName: '',
  });

  const settingsRef = useRef(allSettings);
  const lastSyncedSettingsJsonRef = useRef<string | null>(null);
  const isCloudWriteBlockedRef = useRef(false);
  const recoveryPromptedForUidRef = useRef<string | null>(null);
  const isResolvingIdentityRef = useRef(false);

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
      recoveryPromptedForUidRef.current = null;
      setDeviceRecoveryModal({ isOpen: false, candidates: [], suggestedName: '' });
    }
  }, [user]);

  // Cloud Sync Logic
  useEffect(() => {
    if (!isAuthReady) return;

    const syncSettings = async () => {
      if (user) {
        if (isInitialSyncDone) return;

        setIsCloudSyncing(true);
        console.log(`[Sync] Starting sync for user: ${user.email} (${user.uid})`);

        const hasSyncedBefore = localStorage.getItem('radio-has-synced-with-account') === 'true';
        const rawCloudSettings = await getUserSettings(user.uid);

        if (!rawCloudSettings) {
          const initialAccountSettings = normalizeSettings(loadSettingsFromLocalStorage());
          console.log('[Sync] No cloud settings found, using local settings.');
          lastSyncedSettingsJsonRef.current = JSON.stringify(initialAccountSettings);
          setAllSettings(initialAccountSettings);

          if (!isCloudWriteBlockedRef.current) {
            const res = await saveUserSettings(user.uid, initialAccountSettings);
            if (!res.success && res.permissionDenied) {
              isCloudWriteBlockedRef.current = true;
              saveSettingsToLocalStorage(initialAccountSettings);
              console.warn('[Sync] Firestore write permission denied. Settings will be saved locally.');
            }
          }

          localStorage.setItem('radio-has-synced-with-account', 'true');
          setIsInitialSyncDone(true);
          setIsCloudSyncing(false);
          return;
        }

        const cloudSettings = normalizeSettings(rawCloudSettings);

        if (hasSyncedBefore) {
          console.log('[Sync] Loading settings from cloud, skipping conflict check.');
          lastSyncedSettingsJsonRef.current = JSON.stringify(cloudSettings);
          setAllSettings(cloudSettings);
          localStorage.setItem('radio-has-synced-with-account', 'true');
          setIsInitialSyncDone(true);
          setIsCloudSyncing(false);
        } else {
          const localSettings = settingsRef.current;
          console.log('[Sync] Comparing settings for conflict...');

          if (settingsHaveConflict(localSettings, cloudSettings)) {
            console.log('[Sync] Conflict detected. Opening merge modal.');
            setMergeModal({
              isOpen: true,
              onMerge: async () => {
                console.log('[Sync] User chose to merge/keep local settings.');
                const mergedSettings: AllSettings = {
                  ...localSettings,
                  deviceProfiles: {
                    ...cloudSettings.deviceProfiles,
                    ...localSettings.deviceProfiles,
                  },
                };
                lastSyncedSettingsJsonRef.current = JSON.stringify(mergedSettings);
                setAllSettings(mergedSettings);
                const res = await saveUserSettings(user.uid, mergedSettings);
                if (!res.success && res.permissionDenied) {
                  isCloudWriteBlockedRef.current = true;
                  saveSettingsToLocalStorage(mergedSettings);
                  console.warn('[Sync] Firestore write permission denied. Settings will be saved locally.');
                }
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsInitialSyncDone(true);
                setIsCloudSyncing(false);
              },
              onDiscardLocal: () => {
                console.log('[Sync] User chose to discard local settings and use cloud.');
                lastSyncedSettingsJsonRef.current = JSON.stringify(cloudSettings);
                setAllSettings(cloudSettings);
                localStorage.setItem('radio-has-synced-with-account', 'true');
                setMergeModal(prev => ({ ...prev, isOpen: false }));
                setIsInitialSyncDone(true);
                setIsCloudSyncing(false);
              },
            });
          } else {
            console.log('[Sync] No conflicts found. Using cloud settings.');
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

  // Persistent Device Identity Resolution & Post-Reset Recovery
  useEffect(() => {
    if (!isAuthReady) return;
    if (user && (!isInitialSyncDone || isCloudSyncing || mergeModal.isOpen)) return;
    if (isResolvingIdentityRef.current) return;

    let cancelled = false;

    const resolveDeviceIdentity = async () => {
      isResolvingIdentityRef.current = true;
      try {
        let candidateId = activeDeviceId || getStoredDeviceIdSync();
        if (!candidateId) {
          candidateId = await recoverDeviceIdFromIndexedDB();
        }
        if (cancelled) return;

        const profiles = settingsRef.current.deviceProfiles || {};

        if (candidateId && profiles[candidateId]) {
          if (activeDeviceId !== candidateId) {
            setActiveDeviceId(candidateId);
          }
          await persistActiveDeviceId(candidateId);
          if (cancelled) return;

          const existing = profiles[candidateId];
          const now = Date.now();
          const isStale = now - (existing.lastSeenAt || 0) > 600_000;
          const needsNameUpgrade = isBrokenOrLegacyDeviceName(existing.name);
          const upgradedModelName = needsNameUpgrade
            ? await detectFriendlyDeviceModelAsync(detectedDevice)
            : null;
          if (cancelled) return;

          if (isStale || existing.deviceType !== detectedDevice || (upgradedModelName && upgradedModelName !== existing.name)) {
            const currentSig = collectDeviceSignature();
            setAllSettings(prev => {
              const target = prev.deviceProfiles?.[candidateId!];
              if (!target) return prev;
              const nextName =
                upgradedModelName && isBrokenOrLegacyDeviceName(target.name)
                  ? createDefaultDeviceName(detectedDevice, prev.deviceProfiles, upgradedModelName, target.id)
                  : target.name;
              return {
                ...prev,
                deviceProfiles: {
                  ...prev.deviceProfiles,
                  [candidateId!]: {
                    ...target,
                    name: nextName,
                    deviceType: detectedDevice,
                    signature: currentSig,
                    lastSeenAt: now,
                  },
                },
              };
            });
          }
          return;
        }

        // Missing or unknown local deviceId:
        const detectedModel = await detectFriendlyDeviceModelAsync(detectedDevice);
        if (cancelled) return;

        const hasCloudProfiles = Object.keys(profiles).length > 0;
        if (user && hasCloudProfiles && recoveryPromptedForUidRef.current !== user.uid) {
          recoveryPromptedForUidRef.current = user.uid;
          const sig = collectDeviceSignature();
          const ranked = rankRecoveryCandidates(profiles, detectedDevice, sig);
          setDeviceRecoveryModal({
            isOpen: true,
            candidates: ranked,
            suggestedName: createDefaultDeviceName(detectedDevice, profiles, detectedModel),
          });
          return;
        }

        // First device ever or offline/guest mode: auto-register profile cleanly
        const newId = candidateId || generateDeviceId();
        const sig = collectDeviceSignature();
        const now = Date.now();
        await persistActiveDeviceId(newId);
        if (cancelled) return;

        setActiveDeviceId(newId);
        setAllSettings(prev => {
          const prevProfiles = prev.deviceProfiles || {};
          if (prevProfiles[newId]) return prev;
          const isFirstProfileEver = Object.keys(prevProfiles).length === 0;
          const newProfile: DeviceProfile = {
            id: newId,
            name: createDefaultDeviceName(detectedDevice, prevProfiles, detectedModel),
            deviceType: detectedDevice,
            signature: sig,
            createdAt: now,
            lastSeenAt: now,
            overrides: isFirstProfileEver ? extractCustomOverridesForMigration(prev) : {},
          };
          return {
            ...prev,
            deviceProfiles: {
              ...prevProfiles,
              [newId]: newProfile,
            },
          };
        });
      } finally {
        isResolvingIdentityRef.current = false;
      }
    };

    resolveDeviceIdentity();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthReady,
    user,
    isInitialSyncDone,
    isCloudSyncing,
    mergeModal.isOpen,
    activeDeviceId,
    detectedDevice,
  ]);

  const confirmRecoveryProfile = useCallback(async (profileId: string) => {
    const sig = collectDeviceSignature();
    const now = Date.now();
    await persistActiveDeviceId(profileId);
    setActiveDeviceId(profileId);
    setAllSettings(prev => {
      const target = prev.deviceProfiles?.[profileId];
      if (!target) return prev;
      return {
        ...prev,
        deviceProfiles: {
          ...prev.deviceProfiles,
          [profileId]: {
            ...target,
            deviceType: detectedDevice,
            signature: sig,
            lastSeenAt: now,
          },
        },
      };
    });
    setDeviceRecoveryModal({ isOpen: false, candidates: [], suggestedName: '' });
  }, [detectedDevice]);

  const createNewRecoveryProfile = useCallback(async (customName: string) => {
    const newId = generateDeviceId();
    const sig = collectDeviceSignature();
    const now = Date.now();
    await persistActiveDeviceId(newId);
    setActiveDeviceId(newId);
    setAllSettings(prev => {
      const prevProfiles = prev.deviceProfiles || {};
      const finalName = customName.trim() || createDefaultDeviceName(detectedDevice, prevProfiles);
      const newProfile: DeviceProfile = {
        id: newId,
        name: finalName,
        deviceType: detectedDevice,
        signature: sig,
        createdAt: now,
        lastSeenAt: now,
        overrides: {},
      };
      return {
        ...prev,
        deviceProfiles: {
          ...prevProfiles,
          [newId]: newProfile,
        },
      };
    });
    setDeviceRecoveryModal({ isOpen: false, candidates: [], suggestedName: '' });
  }, [detectedDevice]);

  // Persistence
  useEffect(() => {
    if (!user) {
      saveSettingsToLocalStorage(allSettings);
      return;
    }

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
            console.warn('[Sync] Firestore write permission denied. Falling back to local storage for this session.');
          }
        }
      });
    }
  }, [allSettings, user, isCloudSyncing, isInitialSyncDone]);

  const updateSettings = (updater: (prev: AllSettings) => AllSettings) => {
    setAllSettings(updater);
  };

  const updateScopedSettings = useCallback(
    (scope: SettingsEditScope, partial: Partial<DeviceScopedSettings>) => {
      setAllSettings(prev => applyScopedUpdate(prev, scope, partial));
    },
    []
  );

  const resetScopedOverrideKey = useCallback((deviceId: string, key: DeviceScopedSettingKey) => {
    setAllSettings(prev => resetDeviceOverrideKey(prev, deviceId, key));
  }, []);

  const resetScopedAllOverrides = useCallback((deviceId: string) => {
    setAllSettings(prev => resetAllDeviceOverrides(prev, deviceId));
  }, []);

  const renameDeviceProfile = useCallback((deviceId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAllSettings(prev => {
      const target = prev.deviceProfiles?.[deviceId];
      if (!target) return prev;
      return {
        ...prev,
        deviceProfiles: {
          ...prev.deviceProfiles,
          [deviceId]: {
            ...target,
            name: trimmed,
          },
        },
      };
    });
  }, []);

  const deleteDeviceProfile = useCallback((deviceId: string) => {
    if (deviceId === activeDeviceId) return;
    setAllSettings(prev => {
      if (!prev.deviceProfiles?.[deviceId]) return prev;
      const nextProfiles = { ...prev.deviceProfiles };
      delete nextProfiles[deviceId];
      return {
        ...prev,
        deviceProfiles: nextProfiles,
      };
    });
  }, [activeDeviceId]);

  const switchActiveDeviceProfile = useCallback(async (profileId: string) => {
    await confirmRecoveryProfile(profileId);
  }, [confirmRecoveryProfile]);

  const handleToggleSettingsSection = (section: keyof SettingsSections) => {
    setAllSettings(prev => ({
      ...prev,
      settingsSections: {
        ...prev.settingsSections,
        [section]: !prev.settingsSections[section],
      },
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
        setUpdateStatus(cs => (cs === 'checking' ? 'not-found' : cs));
        if (updateStatus === 'not-found') setTimeout(() => setUpdateStatus('idle'), 3000);
      }, 5000);
    } catch {
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  }, [updateStatus]);

  return {
    allSettings,
    setAllSettings,
    updateSettings,
    activeDeviceId,
    isCloudSyncing,
    mergeModal,
    setMergeModal,
    deviceRecoveryModal,
    confirmRecoveryProfile,
    createNewRecoveryProfile,
    updateScopedSettings,
    resetScopedOverrideKey,
    resetScopedAllOverrides,
    renameDeviceProfile,
    deleteDeviceProfile,
    switchActiveDeviceProfile,
    handleToggleSettingsSection,
    updateStatus,
    handleManualUpdateCheck,
  };
};
