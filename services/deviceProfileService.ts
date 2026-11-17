import {
  AllSettings,
  DETECTED_DEVICE_LABELS,
  DEVICE_SCOPED_SETTING_KEYS,
  DetectedDeviceType,
  DeviceProfile,
  DeviceScopedSettingKey,
  DeviceScopedSettings,
  DeviceSignature,
  SettingsEditScope,
} from '../types/settings';
import { defaultSettings } from '../store/initialSettings';

const ACTIVE_DEVICE_STORAGE_KEY = 'radio-active-device-id';
const IDB_DB_NAME = 'radio-device-identity';
const IDB_STORE_NAME = 'meta';
const IDB_KEY = 'activeDeviceId';

interface NavigatorUADataExtended extends Navigator {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
    getHighEntropyValues?: (hints: string[]) => Promise<{
      model?: string;
      platform?: string;
      platformVersion?: string;
    }>;
  };
}

export const getStoredDeviceIdSync = (): string | null => {
  try {
    const val = localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY);
    return val && val.trim().length > 0 ? val : null;
  } catch {
    return null;
  }
};

export const saveDeviceIdToLocalSync = (deviceId: string): void => {
  try {
    localStorage.setItem(ACTIVE_DEVICE_STORAGE_KEY, deviceId);
  } catch {
    // Ignore storage quota / privacy mode errors
  }
};

const openIdentityDb = (): Promise<IDBDatabase | null> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const recoverDeviceIdFromIndexedDB = async (): Promise<string | null> => {
  const db = await openIdentityDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const res = typeof req.result === 'string' && req.result.trim().length > 0 ? req.result : null;
        resolve(res);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
};

export const persistActiveDeviceId = async (deviceId: string): Promise<void> => {
  saveDeviceIdToLocalSync(deviceId);
  const db = await openIdentityDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(deviceId, IDB_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
};

export const generateDeviceId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `dev_${crypto.randomUUID()}`;
  }
  return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const detectUserAgentFamily = (ua: string, maxTouchPoints: number): string => {
  if (/iPhone|iPod/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/CrOS/i.test(ua)) return 'Chromebook';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Browser';
};

const parseAndroidModelFromUA = (ua: string): string | null => {
  const match = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i);
  if (!match || !match[1]) return null;
  const rawModel = match[1].replace(/\bwv\b/gi, '').trim();
  // Chrome freezes Android UA model to generic "K" in UA-reduction; ignore placeholders
  if (!rawModel || rawModel.length < 2 || rawModel === 'K' || /^Android/i.test(rawModel)) {
    return null;
  }
  return rawModel.slice(0, 28);
};

export const isBrokenOrLegacyDeviceName = (name: string): boolean => {
  const trimmed = (name || '').trim();
  return (
    !trimmed ||
    /^undefined(?:[\s_-]*\d+)?$/i.test(trimmed) ||
    /^null(?:[\s_-]*\d+)?$/i.test(trimmed) ||
    /^(טלפון|טאבלט|מחשב)(?:\s+\d+)?$/.test(trimmed)
  );
};

export const detectFriendlyDeviceModelSync = (deviceType: DetectedDeviceType): string => {
  const fallbackLabel = DETECTED_DEVICE_LABELS[deviceType] || 'מכשיר';
  if (typeof navigator === 'undefined') {
    return fallbackLabel;
  }
  const ua = navigator.userAgent || '';
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'iPad';

  if (/Android/i.test(ua)) {
    const parsedModel = parseAndroidModelFromUA(ua);
    if (parsedModel) return parsedModel;
    return deviceType === 'tablet' ? 'Android Tablet' : 'Android';
  }

  if (/Windows NT 10\.0/i.test(ua)) return 'Win10';
  if (/Windows NT 6\.3/i.test(ua)) return 'Win8.1';
  if (/Windows NT 6\.2/i.test(ua)) return 'Win8';
  if (/Windows NT 6\.1/i.test(ua)) return 'Win7';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/CrOS/i.test(ua)) return 'Chromebook';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';

  return fallbackLabel;
};

export const detectFriendlyDeviceModelAsync = async (
  deviceType: DetectedDeviceType
): Promise<string> => {
  const syncGuess = detectFriendlyDeviceModelSync(deviceType);
  if (typeof navigator === 'undefined') return syncGuess;

  const nav = navigator as NavigatorUADataExtended;
  if (!nav.userAgentData?.getHighEntropyValues) {
    return syncGuess;
  }

  try {
    const data = await nav.userAgentData.getHighEntropyValues([
      'model',
      'platform',
      'platformVersion',
    ]);
    const model = data.model?.trim();
    const platform = data.platform?.trim() || '';
    const platformMajor = parseInt((data.platformVersion || '').split('.')[0], 10);

    if (
      model &&
      model.length >= 2 &&
      model !== 'K' &&
      !/^(undefined|null)$/i.test(model)
    ) {
      return model.slice(0, 28);
    }
    if (/Windows/i.test(platform) && !isNaN(platformMajor) && platformMajor > 0) {
      return platformMajor >= 13 ? 'Win11' : 'Win10';
    }
    if (/Windows/i.test(platform)) return syncGuess.startsWith('Win') ? syncGuess : 'Win10';
    if (/macOS/i.test(platform)) return 'Mac';
    if (/Chrome OS/i.test(platform)) return 'Chromebook';
  } catch {
    // Fall back gracefully to sync guess
  }

  return syncGuess;
};

export const deduplicateDeviceName = (
  baseName: string,
  existingProfiles: Record<string, DeviceProfile>,
  excludeId?: string
): string => {
  const cleanBase = baseName.trim() || 'מכשיר';
  const existingNames = new Set(
    Object.values(existingProfiles)
      .filter((p) => p.id !== excludeId)
      .map((p) => p.name.trim().toLowerCase())
  );
  if (!existingNames.has(cleanBase.toLowerCase())) {
    return cleanBase;
  }
  let index = 1;
  while (existingNames.has(`${cleanBase}_${index}`.toLowerCase())) {
    index += 1;
  }
  return `${cleanBase}_${index}`;
};

export const createDefaultDeviceName = (
  deviceType: DetectedDeviceType,
  existingProfiles: Record<string, DeviceProfile>,
  detectedModel?: string,
  excludeId?: string
): string => {
  const trimmedModel = detectedModel?.trim();
  const base =
    trimmedModel && !/^(undefined|null)$/i.test(trimmedModel)
      ? trimmedModel
      : detectFriendlyDeviceModelSync(deviceType);
  return deduplicateDeviceName(base, existingProfiles, excludeId);
};

export const collectDeviceSignature = (): DeviceSignature => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      platform: 'unknown',
      screenBucket: '0x0',
      touchCapable: false,
      userAgentFamily: 'Browser',
    };
  }
  const ua = navigator.userAgent || '';
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;
  const hasCoarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const touchCapable = hasCoarse || maxTouchPoints > 0;
  const w = window.screen?.width || window.innerWidth || 0;
  const h = window.screen?.height || window.innerHeight || 0;
  const shortSide = Math.round(Math.min(w, h) / 20) * 20;
  const longSide = Math.round(Math.max(w, h) / 20) * 20;

  return {
    platform: (navigator.platform || 'unknown').slice(0, 40),
    screenBucket: `${shortSide}x${longSide}`,
    touchCapable,
    userAgentFamily: detectUserAgentFamily(ua, maxTouchPoints),
  };
};

export const scoreProfileMatch = (
  profile: DeviceProfile,
  currentType: DetectedDeviceType,
  currentSig: DeviceSignature
): number => {
  let score = 0;
  if (profile.deviceType === currentType) score += 50;
  if (profile.signature?.userAgentFamily === currentSig.userAgentFamily) score += 25;
  if (profile.signature?.touchCapable === currentSig.touchCapable) score += 10;
  if (profile.signature?.platform === currentSig.platform) score += 10;
  if (profile.signature?.screenBucket === currentSig.screenBucket) score += 15;
  return score;
};

export const rankRecoveryCandidates = (
  profiles: Record<string, DeviceProfile>,
  currentType: DetectedDeviceType,
  currentSig: DeviceSignature
): { profile: DeviceProfile; score: number }[] => {
  return Object.values(profiles)
    .map((profile) => ({
      profile,
      score: scoreProfileMatch(profile, currentType, currentSig),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.profile.lastSeenAt || 0) - (a.profile.lastSeenAt || 0);
    });
};

export const formatRelativeTimeHe = (timestamp: number): string => {
  if (!timestamp) return 'לא ידוע';
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 2) return 'ממש עכשיו';
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return diffHours === 1 ? 'לפני שעה' : `לפני ${diffHours} שעות`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 30) return `לפני ${diffDays} ימים`;
  const diffMonths = Math.floor(diffDays / 30);
  return diffMonths === 1 ? 'לפני חודש' : `לפני ${diffMonths} חודשים`;
};

const valuesEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
};

export const extractDeviceScopedBase = (settings: AllSettings): DeviceScopedSettings => {
  return {
    eqPreset: settings.eqPreset,
    customEqSettings: settings.customEqSettings,
    isWakeLockEnabled: settings.isWakeLockEnabled,
    isPixelShiftEnabled: settings.isPixelShiftEnabled,
    autoDimSeconds: settings.autoDimSeconds,
    dimLevel: settings.dimLevel,
    dimOpacity: settings.dimOpacity,
    dimWakeMode: settings.dimWakeMode,
    emergencyTimeoutMinutes: settings.emergencyTimeoutMinutes,
    deviceMode: settings.deviceMode,
    gridSize: settings.gridSize,
    isNowPlayingVisualizerEnabled: settings.isNowPlayingVisualizerEnabled,
    isPlayerBarVisualizerEnabled: settings.isPlayerBarVisualizerEnabled,
    visualizerStyle: settings.visualizerStyle,
    isStatusIndicatorEnabled: settings.isStatusIndicatorEnabled,
    isVolumeControlVisible: settings.isVolumeControlVisible,
    showNextSong: settings.showNextSong,
    isMarqueeProgramEnabled: settings.isMarqueeProgramEnabled,
    isMarqueeCurrentTrackEnabled: settings.isMarqueeCurrentTrackEnabled,
    isMarqueeNextTrackEnabled: settings.isMarqueeNextTrackEnabled,
    marqueeSpeed: settings.marqueeSpeed,
    marqueeDelay: settings.marqueeDelay,
  };
};

export const extractCustomOverridesForMigration = (
  settings: AllSettings
): Partial<DeviceScopedSettings> => {
  const overrides: Partial<DeviceScopedSettings> = {};
  for (const key of DEVICE_SCOPED_SETTING_KEYS) {
    const currentVal = settings[key];
    const defaultVal = defaultSettings[key];
    if (!valuesEqual(currentVal, defaultVal)) {
      (overrides as Record<string, unknown>)[key] = currentVal;
    }
  }
  return overrides;
};

export const resolveDeviceScopedForType = (
  settings: AllSettings,
  deviceType: DetectedDeviceType
): DeviceScopedSettings => {
  const base = extractDeviceScopedBase(settings);
  const typeLayer = settings.deviceTypeDefaults?.[deviceType] || {};
  return {
    ...base,
    ...typeLayer,
    customEqSettings: typeLayer.customEqSettings ?? base.customEqSettings,
  };
};

export const resolveDeviceScopedForDevice = (
  settings: AllSettings,
  deviceId: string | null,
  fallbackDetectedType: DetectedDeviceType
): {
  resolved: DeviceScopedSettings;
  effectiveDeviceType: DetectedDeviceType;
  activeProfile: DeviceProfile | null;
  overriddenKeys: Set<DeviceScopedSettingKey>;
} => {
  const activeProfile = deviceId ? settings.deviceProfiles?.[deviceId] || null : null;
  const baseMode = activeProfile?.overrides?.deviceMode ?? settings.deviceMode;
  const baseType: DetectedDeviceType =
    baseMode && baseMode !== 'auto'
      ? baseMode
      : activeProfile?.deviceType || fallbackDetectedType;

  const typeLayer = settings.deviceTypeDefaults?.[baseType] || {};
  const deviceLayer = activeProfile?.overrides || {};
  const modeFromLayers = deviceLayer.deviceMode ?? typeLayer.deviceMode ?? settings.deviceMode;
  const effectiveDeviceType: DetectedDeviceType =
    modeFromLayers && modeFromLayers !== 'auto'
      ? modeFromLayers
      : activeProfile?.deviceType || fallbackDetectedType;

  const base = extractDeviceScopedBase(settings);
  const finalTypeLayer = settings.deviceTypeDefaults?.[effectiveDeviceType] || {};
  const inheritedBase: DeviceScopedSettings = {
    ...base,
    ...finalTypeLayer,
    customEqSettings: finalTypeLayer.customEqSettings ?? base.customEqSettings,
  };

  const resolved: DeviceScopedSettings = {
    ...inheritedBase,
    ...deviceLayer,
    customEqSettings: deviceLayer.customEqSettings ?? inheritedBase.customEqSettings,
  };

  // Only flag keys as overridden when their value actually differs from the inherited default!
  const overriddenKeys = new Set<DeviceScopedSettingKey>();
  for (const key of DEVICE_SCOPED_SETTING_KEYS) {
    if (key in deviceLayer && !valuesEqual(deviceLayer[key], inheritedBase[key])) {
      overriddenKeys.add(key);
    }
  }

  return {
    resolved,
    effectiveDeviceType,
    activeProfile,
    overriddenKeys,
  };
};

export const resolveForEditScope = (
  settings: AllSettings,
  scope: SettingsEditScope,
  fallbackDetectedType: DetectedDeviceType
): {
  resolved: DeviceScopedSettings;
  effectiveType: DetectedDeviceType;
  targetProfile: DeviceProfile | null;
  overriddenKeys: Set<DeviceScopedSettingKey>;
} => {
  if (scope.kind === 'type') {
    return {
      resolved: resolveDeviceScopedForType(settings, scope.deviceType),
      effectiveType: scope.deviceType,
      targetProfile: null,
      overriddenKeys: new Set<DeviceScopedSettingKey>(),
    };
  }
  const res = resolveDeviceScopedForDevice(settings, scope.deviceId, fallbackDetectedType);
  return {
    resolved: res.resolved,
    effectiveType: res.effectiveDeviceType,
    targetProfile: res.activeProfile,
    overriddenKeys: res.overriddenKeys,
  };
};

export const applyScopedUpdate = (
  settings: AllSettings,
  scope: SettingsEditScope,
  partial: Partial<DeviceScopedSettings>
): AllSettings => {
  if (scope.kind === 'type') {
    const existingTypeDefaults = settings.deviceTypeDefaults?.[scope.deviceType] || {};
    const nextTypeDefaults = {
      ...existingTypeDefaults,
      ...partial,
    };
    const nextAll: AllSettings = {
      ...settings,
      deviceTypeDefaults: {
        ...settings.deviceTypeDefaults,
        [scope.deviceType]: nextTypeDefaults,
      },
    };

    // Prune any profile overrides on this deviceType that now equal the updated type default
    const nextProfiles = { ...nextAll.deviceProfiles };
    for (const [id, prof] of Object.entries(nextProfiles)) {
      if (prof.deviceType !== scope.deviceType) continue;
      const inherited = resolveDeviceScopedForType(nextAll, scope.deviceType);
      const cleanedOverrides: Partial<DeviceScopedSettings> = { ...prof.overrides };
      let changed = false;
      for (const k of Object.keys(cleanedOverrides) as DeviceScopedSettingKey[]) {
        if (valuesEqual(cleanedOverrides[k], inherited[k])) {
          delete cleanedOverrides[k];
          changed = true;
        }
      }
      if (changed) {
        nextProfiles[id] = { ...prof, overrides: cleanedOverrides };
      }
    }

    return {
      ...nextAll,
      deviceProfiles: nextProfiles,
    };
  }

  const profile = settings.deviceProfiles?.[scope.deviceId];
  if (!profile) {
    return {
      ...settings,
      ...partial,
    };
  }

  const nextOverrides: Partial<DeviceScopedSettings> = {
    ...profile.overrides,
    ...partial,
  };

  // Determine the effective type AFTER applying partial (e.g. if deviceMode changed)
  const nextBaseMode = nextOverrides.deviceMode ?? settings.deviceMode;
  const targetType: DetectedDeviceType =
    nextBaseMode && nextBaseMode !== 'auto' ? nextBaseMode : profile.deviceType;
  const inheritedBase = resolveDeviceScopedForType(settings, targetType);

  // Automatically remove any override key that matches the original inherited value
  for (const key of DEVICE_SCOPED_SETTING_KEYS) {
    if (key in nextOverrides && valuesEqual(nextOverrides[key], inheritedBase[key])) {
      delete nextOverrides[key];
    }
  }

  return {
    ...settings,
    deviceProfiles: {
      ...settings.deviceProfiles,
      [scope.deviceId]: {
        ...profile,
        lastSeenAt: Date.now(),
        overrides: nextOverrides,
      },
    },
  };
};

export const resetDeviceOverrideKey = (
  settings: AllSettings,
  deviceId: string,
  key: DeviceScopedSettingKey
): AllSettings => {
  const profile = settings.deviceProfiles?.[deviceId];
  if (!profile || !(key in profile.overrides)) return settings;

  const nextOverrides = { ...profile.overrides };
  delete nextOverrides[key];

  return {
    ...settings,
    deviceProfiles: {
      ...settings.deviceProfiles,
      [deviceId]: {
        ...profile,
        overrides: nextOverrides,
      },
    },
  };
};

export const resetAllDeviceOverrides = (
  settings: AllSettings,
  deviceId: string
): AllSettings => {
  const profile = settings.deviceProfiles?.[deviceId];
  if (!profile) return settings;

  return {
    ...settings,
    deviceProfiles: {
      ...settings.deviceProfiles,
      [deviceId]: {
        ...profile,
        overrides: {},
      },
    },
  };
};

export const mergeActiveSettingsForApp = (
  settings: AllSettings,
  resolved: DeviceScopedSettings
): AllSettings => ({
  ...settings,
  ...resolved,
});
