import { useState, useEffect, useRef, useCallback } from 'react';
import { saveUserSettings, getUserSettings, settingsHaveConflict, normalizeSettings } from '../services/settingsService';
import { loadSettingsFromLocalStorage, saveSettingsToLocalStorage } from '../services/storageService';
export const useSettings = (user, isAuthReady) => {
    const [allSettings, setAllSettings] = useState(() => loadSettingsFromLocalStorage());
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('idle');
    const [mergeModal, setMergeModal] = useState({
        isOpen: false,
        onMerge: () => { },
        onDiscardLocal: () => { }
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
        if (!isAuthReady)
            return;
        const syncSettings = async () => {
            if (user) {
                // If we already did the initial sync for this user, don't do it again
                if (isInitialSyncDone)
                    return;
                setIsCloudSyncing(true);
                console.log(`[Sync Debug] Current User Email: ${user.email}`);
                console.log(`[Sync Debug] Current User UID: ${user.uid}`);
                console.log(`[Sync Debug] Project ID: ${import.meta.env.VITE_FIREBASE_PROJECT_ID}`);
                const hasSyncedBefore = localStorage.getItem('radio-has-synced-with-account') === 'true';
                console.log(`[Sync Debug] Has synced before on this device? ${hasSyncedBefore}`);
                const rawCloudSettings = await getUserSettings(user.uid);
                console.log(`[Sync Debug] Raw cloud settings found? ${!!rawCloudSettings}`);
                if (rawCloudSettings) {
                    console.log(`[Sync Debug] Cloud favorites count: ${rawCloudSettings.favorites?.length || 0}`);
                }
                const cloudSettings = normalizeSettings(rawCloudSettings);
                if (!rawCloudSettings) {
                    // Case: New user or new project - UPLOAD local settings to cloud
                    const localSettings = settingsRef.current;
                    console.log("[Sync Debug] No cloud settings found. Initializing cloud with local settings.");
                    await saveUserSettings(user.uid, localSettings);
                    setAllSettings(localSettings);
                    localStorage.setItem('radio-has-synced-with-account', 'true');
                    setIsInitialSyncDone(true);
                    setIsCloudSyncing(false);
                    return;
                }
                if (hasSyncedBefore) {
                    console.log("[Sync Debug] Loading settings from cloud (already synced before).");
                    setAllSettings(cloudSettings);
                    localStorage.setItem('radio-has-synced-with-account', 'true');
                    setIsInitialSyncDone(true);
                    setIsCloudSyncing(false);
                }
                else {
                    const localSettings = settingsRef.current;
                    console.log("[Sync Debug] Comparing settings for conflict...");
                    if (settingsHaveConflict(localSettings, cloudSettings)) {
                        console.log("[Sync Debug] Conflict detected. Opening merge modal.");
                        setMergeModal({
                            isOpen: true,
                            onMerge: () => {
                                console.log("[Sync Debug] User chose to merge/keep local settings.");
                                setAllSettings(localSettings);
                                saveUserSettings(user.uid, localSettings);
                                localStorage.setItem('radio-has-synced-with-account', 'true');
                                setMergeModal(prev => ({ ...prev, isOpen: false }));
                                setIsInitialSyncDone(true);
                                setIsCloudSyncing(false);
                            },
                            onDiscardLocal: () => {
                                console.log("[Sync Debug] User chose to discard local settings and use cloud.");
                                setAllSettings(cloudSettings);
                                localStorage.setItem('radio-has-synced-with-account', 'true');
                                setMergeModal(prev => ({ ...prev, isOpen: false }));
                                setIsInitialSyncDone(true);
                                setIsCloudSyncing(false);
                            },
                        });
                    }
                    else {
                        console.log("[Sync Debug] No conflicts found. Using cloud settings.");
                        setAllSettings(cloudSettings);
                        localStorage.setItem('radio-has-synced-with-account', 'true');
                        setIsInitialSyncDone(true);
                        setIsCloudSyncing(false);
                    }
                }
            }
            else {
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
    const updateSettings = (updater) => {
        setAllSettings(updater);
    };
    const handleToggleSettingsSection = (section) => {
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
                if (updateStatus === 'not-found')
                    setTimeout(() => setUpdateStatus('idle'), 3000);
            }, 5000);
        }
        catch (error) {
            setUpdateStatus('error');
            setTimeout(() => setUpdateStatus('idle'), 3000);
        }
    }, [updateStatus]);
    const forcePushToCloud = async () => {
        if (!user)
            return;
        setIsCloudSyncing(true);
        await saveUserSettings(user.uid, allSettings);
        setIsCloudSyncing(false);
        console.log("[Sync] Force pushed settings to cloud.");
    };
    const forcePullFromCloud = async () => {
        if (!user)
            return;
        setIsCloudSyncing(true);
        const raw = await getUserSettings(user.uid);
        if (raw) {
            const normalized = normalizeSettings(raw);
            setAllSettings(normalized);
            console.log("[Sync] Force pulled settings from cloud.");
        }
        setIsCloudSyncing(false);
    };
    return {
        allSettings,
        setAllSettings,
        updateSettings,
        isCloudSyncing,
        mergeModal,
        setMergeModal,
        handleToggleSettingsSection,
        updateStatus,
        handleManualUpdateCheck,
        forcePushToCloud,
        forcePullFromCloud
    };
};
