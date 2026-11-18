import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  deleteDoc,
  deleteField
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { AllSettings, DIM_LEVELS, DEVICE_MODES, DETECTED_DEVICE_LABELS, DetectedDeviceType, DeviceProfile, DeviceTypeDefaults } from '../types/settings';
import { defaultSettings } from '../store/initialSettings';
import { Station, StationAdminMeta } from '../types/station';

const ADMINS_COLLECTION = 'admins';
const APP_DATA_COLLECTION = 'app_data';
const STATIONS_DOC_ID = 'stations_list';
const ADMIN_META_LOCAL_KEY = 'radio_admin_meta_v1';

const stripUndefinedDeep = <T>(val: T): T => {
  if (Array.isArray(val)) {
    return val.map(stripUndefinedDeep) as unknown as T;
  }
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return val;
};

export interface SaveSettingsResult {
  success: boolean;
  permissionDenied?: boolean;
}

const isPermissionDeniedError = (error: unknown): boolean => {
  const err = error as { code?: string; message?: string } | null;
  return (
    err?.code === 'permission-denied' ||
    (typeof err?.message === 'string' && err.message.includes('Missing or insufficient permissions'))
  );
};

export const saveUserSettings = async (userId: string, settings: AllSettings): Promise<SaveSettingsResult> => {
  if (!userId || auth.currentUser?.uid !== userId) {
    return { success: false };
  }
  const userDocRef = doc(db, 'users', userId);
  try {
    await setDoc(userDocRef, { ...settings, lastUpdated: serverTimestamp() }, { merge: true });
    return { success: true };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { success: false, permissionDenied: true };
    }
    console.warn("Could not save user settings to Firestore:", error);
    return { success: false };
  }
};

export const getUserSettings = async (userId: string): Promise<AllSettings | null> => {
  if (!userId) return null;
  const userDocRef = doc(db, 'users', userId);
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      delete data.lastUpdated;
      return data as AllSettings;
    }
    return null;
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      console.warn("Firestore read permission denied for user settings; using local settings.");
      return null;
    }
    console.warn("Error fetching user settings from Firestore:", error);
    return null;
  }
};

export const checkAdminRole = async (email: string): Promise<boolean> => {
    if (!email) return false;
    try {
        const normalizedEmail = email.toLowerCase();
        const docRef = doc(db, ADMINS_COLLECTION, normalizedEmail);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (error) {
        console.error("Error checking admin role:", error);
        return false;
    }
};

export const fetchAdmins = async (): Promise<string[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, ADMINS_COLLECTION));
        return querySnapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Error fetching admins:", error);
        return [];
    }
};

export const addAdmin = async (email: string) => {
    const normalizedEmail = email.toLowerCase();
    await setDoc(doc(db, ADMINS_COLLECTION, normalizedEmail), {
        addedAt: serverTimestamp(),
        role: 'admin'
    });
    return true;
};

export const removeAdmin = async (email: string) => {
    const normalizedEmail = email.toLowerCase();
    await deleteDoc(doc(db, ADMINS_COLLECTION, normalizedEmail));
    return true;
};

export const fetchCustomStations = async (): Promise<Station[] | null> => {
    try {
        const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return Array.isArray(data.stations) ? (data.stations as Station[]) : null;
        }
        return null;
    } catch (error) {
        console.error("Error fetching custom stations:", error);
        return null;
    }
};

export const saveCustomStations = async (stations: Station[]) => {
    const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
    const sanitizedStations = stripUndefinedDeep(stations);
    await setDoc(docRef, { 
        stations: sanitizedStations,
        updatedAt: serverTimestamp() 
    }, { merge: true });
    return true;
};

export const resetStationsInFirestore = async () => {
    const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data()?.adminMeta) {
        await setDoc(docRef, { stations: deleteField(), updatedAt: serverTimestamp() }, { merge: true });
    } else {
        await deleteDoc(docRef);
    }
    return true;
};

const EMPTY_ADMIN_META: StationAdminMeta = {
    archivedNonHttps: [],
    ignoredDuplicatePairs: [],
    lastBulkCheckAt: null,
};

const normalizeAdminMeta = (raw: any): StationAdminMeta => ({
    archivedNonHttps: Array.isArray(raw?.archivedNonHttps) ? raw.archivedNonHttps : [],
    ignoredDuplicatePairs: Array.isArray(raw?.ignoredDuplicatePairs) ? raw.ignoredDuplicatePairs : [],
    lastBulkCheckAt: typeof raw?.lastBulkCheckAt === 'number' ? raw.lastBulkCheckAt : null,
});

export const getLocalStationAdminMeta = (): StationAdminMeta => {
    try {
        const raw = localStorage.getItem(ADMIN_META_LOCAL_KEY);
        if (!raw) return EMPTY_ADMIN_META;
        return normalizeAdminMeta(JSON.parse(raw));
    } catch {
        return EMPTY_ADMIN_META;
    }
};

export const fetchStationAdminMeta = async (): Promise<StationAdminMeta> => {
    const local = getLocalStationAdminMeta();
    try {
        const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data()?.adminMeta) {
            const cloud = normalizeAdminMeta(docSnap.data().adminMeta);
            try {
                localStorage.setItem(ADMIN_META_LOCAL_KEY, JSON.stringify(cloud));
            } catch {}
            return cloud;
        }
    } catch (error) {
        console.warn("Could not fetch admin meta from Firestore, using local cache:", error);
    }
    return local;
};

export const saveStationAdminMeta = async (meta: StationAdminMeta): Promise<boolean> => {
    const cleanMeta = stripUndefinedDeep(normalizeAdminMeta(meta));
    try {
        localStorage.setItem(ADMIN_META_LOCAL_KEY, JSON.stringify(cleanMeta));
    } catch {}
    try {
        const docRef = doc(db, APP_DATA_COLLECTION, STATIONS_DOC_ID);
        await setDoc(docRef, {
            adminMeta: cleanMeta,
            adminMetaUpdatedAt: serverTimestamp(),
        }, { merge: true });
        return true;
    } catch (error) {
        console.warn("Could not save admin meta to Firestore:", error);
        return false;
    }
};

export const normalizeSettings = (raw: any): AllSettings => {
  if (!raw) return defaultSettings;

  const rawTypeDefaults = raw.deviceTypeDefaults || {};
  const deviceTypeDefaults: DeviceTypeDefaults = {
    mobile: { ...defaultSettings.deviceTypeDefaults.mobile, ...(rawTypeDefaults.mobile || {}) },
    tablet: { ...defaultSettings.deviceTypeDefaults.tablet, ...(rawTypeDefaults.tablet || {}) },
    desktop: { ...defaultSettings.deviceTypeDefaults.desktop, ...(rawTypeDefaults.desktop || {}) },
  };

  const normalizedProfiles: Record<string, DeviceProfile> = {};
  if (raw.deviceProfiles && typeof raw.deviceProfiles === 'object') {
    for (const [id, profile] of Object.entries(raw.deviceProfiles as Record<string, any>)) {
      if (!profile || typeof profile !== 'object') continue;
      const validType: DetectedDeviceType =
        profile.deviceType === 'mobile' || profile.deviceType === 'tablet' || profile.deviceType === 'desktop'
          ? profile.deviceType
          : 'mobile';
      const rawName = typeof profile.name === 'string' ? profile.name.trim() : '';
      const isBrokenName = !rawName || /^(?:undefined|null)(?:[\s_-]*\d+)?$/i.test(rawName);
      const normalizedCasingName = rawName.replace(/^WIN(10|11|8\.1|8|7)(_\d+)?$/, 'Win$1$2');
      normalizedProfiles[id] = {
        id: typeof profile.id === 'string' && profile.id ? profile.id : id,
        name: isBrokenName ? (DETECTED_DEVICE_LABELS[validType] || 'מכשיר') : normalizedCasingName,
        deviceType: validType,
        signature: {
          platform: typeof profile.signature?.platform === 'string' ? profile.signature.platform : 'unknown',
          screenBucket: typeof profile.signature?.screenBucket === 'string' ? profile.signature.screenBucket : '0x0',
          touchCapable: Boolean(profile.signature?.touchCapable),
          userAgentFamily: typeof profile.signature?.userAgentFamily === 'string' ? profile.signature.userAgentFamily : 'Browser',
        },
        createdAt: typeof profile.createdAt === 'number' ? profile.createdAt : Date.now(),
        lastSeenAt: typeof profile.lastSeenAt === 'number' ? profile.lastSeenAt : Date.now(),
        overrides: profile.overrides && typeof profile.overrides === 'object' ? profile.overrides : {},
      };
    }
  }

  return {
    ...defaultSettings,
    ...raw,
    favorites: Array.isArray(raw.favorites) ? raw.favorites : defaultSettings.favorites,
    customOrder: Array.isArray(raw.customOrder) ? raw.customOrder : defaultSettings.customOrder,
    isWakeLockEnabled: typeof raw.isWakeLockEnabled === 'boolean' ? raw.isWakeLockEnabled : defaultSettings.isWakeLockEnabled,
    isPixelShiftEnabled: typeof raw.isPixelShiftEnabled === 'boolean' ? raw.isPixelShiftEnabled : defaultSettings.isPixelShiftEnabled,
    autoDimSeconds: typeof raw.autoDimSeconds === 'number' && raw.autoDimSeconds >= 0 ? raw.autoDimSeconds : defaultSettings.autoDimSeconds,
    dimLevel: DIM_LEVELS.includes(raw.dimLevel) ? raw.dimLevel : defaultSettings.dimLevel,
    dimOpacity: typeof raw.dimOpacity === 'number' && raw.dimOpacity >= 15 && raw.dimOpacity <= 80 ? Math.round(raw.dimOpacity) : defaultSettings.dimOpacity,
    dimWakeMode: raw.dimWakeMode === 'singleTap' || raw.dimWakeMode === 'doubleTap' ? raw.dimWakeMode : defaultSettings.dimWakeMode,
    emergencyTimeoutMinutes: typeof raw.emergencyTimeoutMinutes === 'number' && raw.emergencyTimeoutMinutes >= 0 ? raw.emergencyTimeoutMinutes : defaultSettings.emergencyTimeoutMinutes,
    deviceMode: DEVICE_MODES.includes(raw.deviceMode) ? raw.deviceMode : defaultSettings.deviceMode,
    gridSize: typeof raw.gridSize === 'number' && raw.gridSize >= 0 && raw.gridSize <= 5 ? raw.gridSize : defaultSettings.gridSize,
    settingsSections: { ...defaultSettings.settingsSections, ...raw.settingsSections },
    keyMap: { ...defaultSettings.keyMap, ...raw.keyMap },
    deviceTypeDefaults,
    deviceProfiles: normalizedProfiles,
    customAvatarUrl: typeof raw.customAvatarUrl === 'string' ? raw.customAvatarUrl : null,
    customDisplayName: typeof raw.customDisplayName === 'string' && raw.customDisplayName.trim() ? raw.customDisplayName.trim() : null,
  };
};

export const settingsHaveConflict = (local: AllSettings, cloud: AllSettings): boolean => {
  if (!cloud) return false;
  const localFavs = JSON.stringify(local.favorites.sort());
  const cloudFavs = JSON.stringify(cloud.favorites.sort());
  return localFavs !== cloudFavs;
};
