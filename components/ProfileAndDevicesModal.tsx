import React, { useState, useRef, useEffect } from 'react';
import {
  DETECTED_DEVICE_LABELS,
  DetectedDeviceType,
  DeviceProfile,
  User,
} from '../types';
import {
  collectDeviceSignature,
  formatRelativeTimeHe,
  isCompatibleDeviceProfile,
} from '../services/deviceProfileService';

interface ProfileAndDevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  customAvatarUrl?: string | null;
  customDisplayName?: string | null;
  onUpdateProfileInfo: (updates: { customAvatarUrl?: string | null; customDisplayName?: string | null }) => void;
  onLogin: () => void;
  onLogout: () => void;
  activeDeviceId: string | null;
  detectedDevice?: DetectedDeviceType;
  deviceProfiles: Record<string, DeviceProfile>;
  onRenameDevice: (deviceId: string, newName: string) => void;
  onDeleteDevice: (deviceId: string) => void;
  onSwitchActiveDevice: (deviceId: string) => void;
  onEditRemoteDevice: (deviceId: string) => void;
}

const resizeImageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
};

const ProfileAndDevicesModal: React.FC<ProfileAndDevicesModalProps> = ({
  isOpen,
  onClose,
  user,
  customAvatarUrl,
  customDisplayName,
  onUpdateProfileInfo,
  onLogin,
  onLogout,
  activeDeviceId,
  detectedDevice,
  deviceProfiles,
  onRenameDevice,
  onDeleteDevice,
  onSwitchActiveDevice,
  onEditRemoteDevice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState(customDisplayName || user?.displayName || '');
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [deviceNameDraft, setDeviceNameDraft] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNameDraft(customDisplayName || user?.displayName || '');
      setEditingDeviceId(null);
      setImageError(null);
    }
  }, [isOpen, customDisplayName, user?.displayName]);

  if (!isOpen) return null;

  const avatarSrc = customAvatarUrl || user?.photoURL || null;
  const currentSig = collectDeviceSignature();
  const profilesList = Object.values(deviceProfiles).sort((a, b) => {
    if (a.id === activeDeviceId) return -1;
    if (b.id === activeDeviceId) return 1;
    return (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onUpdateProfileInfo({ customAvatarUrl: dataUrl });
    } catch {
      setImageError('לא ניתן היה לטעון את התמונה. נסה קובץ אחר.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSaveDisplayName = () => {
    const trimmed = nameDraft.trim();
    const googleDefault = user?.displayName?.trim() || '';
    onUpdateProfileInfo({
      customDisplayName: trimmed && trimmed !== googleDefault ? trimmed : null,
    });
  };

  const handleSaveDeviceRename = (deviceId: string) => {
    if (deviceNameDraft.trim()) {
      onRenameDevice(deviceId, deviceNameDraft.trim());
    }
    setEditingDeviceId(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-devices-title"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary rounded-2xl shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col border border-gray-700/50 animate-fade-in-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/40">
          <h2 id="profile-devices-title" className="text-lg font-bold text-text-primary">
            פרופיל אישי ומכשירים
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {/* Section 1: Personal Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="תמונת פרופיל"
                    className="w-16 h-16 rounded-full ring-2 ring-accent object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full ring-2 ring-gray-600 bg-bg-primary flex items-center justify-center text-xl font-bold text-accent">
                    {(nameDraft || 'א').slice(0, 1)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="text-sm font-semibold text-text-primary truncate">
                  {customDisplayName || user?.displayName || 'משתמש אורח'}
                </div>
                {user?.email && (
                  <div className="text-xs text-text-secondary truncate">{user.email}</div>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent/20 hover:bg-accent/35 text-accent transition-colors"
                  >
                    החלף תמונה
                  </button>
                  {customAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => onUpdateProfileInfo({ customAvatarUrl: null })}
                      className="px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
                    >
                      אפס תמונה
                    </button>
                  )}
                </div>
              </div>
            </div>

            {imageError && (
              <p className="text-xs text-red-400">{imageError}</p>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                שם תצוגה אישי
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDisplayName();
                  }}
                  maxLength={32}
                  placeholder="לדוגמה: שי"
                  className="flex-1 min-h-[42px] px-3 py-1.5 text-sm rounded-lg bg-bg-primary border border-gray-600 text-text-primary focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleSaveDisplayName}
                  className="min-h-[42px] px-4 py-1.5 text-xs font-semibold rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors"
                >
                  שמור
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
              <span>{user ? 'מחובר לחשבון Google' : 'התחבר לשמירת הפרופיל והמכשירים בענן'}</span>
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="text-red-400 hover:underline font-medium"
                >
                  התנתק
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onLogin();
                    onClose();
                  }}
                  className="text-accent hover:underline font-medium"
                >
                  התחבר עם Google
                </button>
              )}
            </div>
          </div>

          <hr className="border-gray-700/40" />

          {/* Section 2: Connected Devices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                מכשירים מחוברים ({profilesList.length})
              </h3>
              <span className="text-[11px] text-text-secondary">
                לכל מכשיר הגדרות EQ, מסך וממשק משלו
              </span>
            </div>

            {profilesList.length === 0 ? (
              <p className="text-xs text-text-secondary py-2">
                עדיין לא נרשמו מכשירים בחשבון.
              </p>
            ) : (
              <div className="space-y-2">
                {profilesList.map((profile) => {
                  const isCurrent = profile.id === activeDeviceId;
                  const isCompatible = !detectedDevice || isCompatibleDeviceProfile(profile, detectedDevice, currentSig);
                  const overrideCount = Object.keys(profile.overrides || {}).length;
                  const isEditingThis = editingDeviceId === profile.id;

                  return (
                    <div
                      key={profile.id}
                      className={`p-3 rounded-xl bg-bg-primary border transition-colors ${
                        isCurrent ? 'border-accent/50' : 'border-gray-700/40'
                      }`}
                    >
                      {isEditingThis ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={deviceNameDraft}
                            onChange={(e) => setDeviceNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveDeviceRename(profile.id);
                              if (e.key === 'Escape') setEditingDeviceId(null);
                            }}
                            maxLength={32}
                            className="flex-1 min-h-[38px] px-2.5 py-1 text-sm rounded-lg bg-bg-secondary border border-accent text-text-primary focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveDeviceRename(profile.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent text-white"
                          >
                            שמור
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDeviceId(null)}
                            className="px-2 py-1.5 text-xs text-text-secondary"
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-text-primary truncate">
                                  {profile.name}
                                </span>
                                {isCurrent && (
                                  <span className="text-[11px] font-medium text-accent">
                                    · מכשיר זה
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-text-secondary mt-0.5">
                                {DETECTED_DEVICE_LABELS[profile.deviceType]}
                                <span aria-hidden="true"> · </span>
                                {profile.signature.userAgentFamily}
                                <span aria-hidden="true"> · </span>
                                {formatRelativeTimeHe(profile.lastSeenAt)}
                                {overrideCount > 0 && (
                                  <>
                                    <span aria-hidden="true"> · </span>
                                    {overrideCount} התאמות
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeviceId(profile.id);
                                setDeviceNameDraft(profile.name);
                              }}
                              className="text-accent hover:underline font-medium"
                            >
                              שנה שם
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onEditRemoteDevice(profile.id);
                                onClose();
                              }}
                              className="text-text-secondary hover:text-text-primary transition-colors"
                            >
                              ערוך הגדרות
                            </button>
                            {!isCurrent && (
                              <>
                                {isCompatible && (
                                  <button
                                    type="button"
                                    onClick={() => onSwitchActiveDevice(profile.id)}
                                    className="text-sky-400 hover:underline"
                                  >
                                    הגדר כמכשיר זה
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onDeleteDevice(profile.id)}
                                  className="text-red-400 hover:underline mr-auto"
                                >
                                  הסר
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileAndDevicesModal;
