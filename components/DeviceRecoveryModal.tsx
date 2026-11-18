import React, { useState, useEffect } from 'react';
import { DETECTED_DEVICE_LABELS, DeviceProfile } from '../types/settings';
import { formatRelativeTimeHe } from '../services/deviceProfileService';

interface DeviceRecoveryModalProps {
  isOpen: boolean;
  candidates: { profile: DeviceProfile; score: number }[];
  suggestedName: string;
  detectedLabel?: string;
  onSelectProfile: (profileId: string) => void;
  onCreateNew: (name: string) => void;
}

const DeviceRecoveryModal: React.FC<DeviceRecoveryModalProps> = ({
  isOpen,
  candidates,
  suggestedName,
  detectedLabel,
  onSelectProfile,
  onCreateNew,
}) => {
  const [newDeviceName, setNewDeviceName] = useState(suggestedName);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewDeviceName(suggestedName);
      setIsCreatingNew(false);
    }
  }, [isOpen, suggestedName]);

  if (!isOpen) return null;

  const topCandidate = candidates[0];
  const otherCandidates = candidates.slice(1);

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="device-recovery-title"
    >
      <div className="bg-bg-secondary rounded-2xl shadow-2xl p-6 w-full max-w-md text-right animate-fade-in-up border border-gray-700/50 space-y-5">
        <div>
          <h2 id="device-recovery-title" className="text-xl font-bold text-text-primary mb-1.5">
            זיהוי פרופיל מכשיר
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            נראה שזו כניסה חדשה מדפדפן זה (או לאחר איפוס). בחר לאיזה מכשיר שמור מאותו סוג לשייך אותו כדי לשחזר את הגדרות האקולייזר והמסך שלך.
          </p>
          {detectedLabel && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-primary border border-gray-700/60 text-xs text-text-secondary">
              <span>מכשיר נוכחי זוהה כ:</span>
              <span className="font-semibold text-text-primary">{detectedLabel}</span>
            </div>
          )}
        </div>

        {topCandidate && (
          <div className="p-4 rounded-xl bg-bg-primary border border-accent/40 space-y-3">
            <div className="space-y-1">
              <div className="text-xs font-medium text-accent">התאמה מובילה</div>
              <div className="text-base font-bold text-text-primary">
                {topCandidate.profile.name}
              </div>
              <div className="text-xs text-text-secondary">
                {DETECTED_DEVICE_LABELS[topCandidate.profile.deviceType]}
                <span aria-hidden="true"> · </span>
                {topCandidate.profile.signature.userAgentFamily}
                <span aria-hidden="true"> · </span>
                נצפה {formatRelativeTimeHe(topCandidate.profile.lastSeenAt)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectProfile(topCandidate.profile.id)}
              className="w-full min-h-[44px] bg-accent hover:bg-accent-hover text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
            >
              שייך מכשיר זה ל-{topCandidate.profile.name}
            </button>
          </div>
        )}

        {otherCandidates.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-text-secondary">או בחר פרופיל קיים אחר:</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {otherCandidates.map(({ profile }) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onSelectProfile(profile.id)}
                  className="w-full min-h-[44px] flex items-center justify-between px-3 py-2 rounded-lg bg-bg-primary hover:bg-accent/15 text-right transition-colors border border-gray-700/40"
                >
                  <span className="font-medium text-sm text-text-primary">{profile.name}</span>
                  <span className="text-xs text-text-secondary">
                    {DETECTED_DEVICE_LABELS[profile.deviceType]} · {formatRelativeTimeHe(profile.lastSeenAt)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-700/40">
          {!isCreatingNew ? (
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="w-full min-h-[44px] bg-bg-primary hover:bg-gray-700/50 text-text-primary font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              הגדר כמכשיר חדש לגמרי
            </button>
          ) : (
            <div className="space-y-2.5">
              <label className="block text-xs font-medium text-text-secondary">
                שם למכשיר החדש (לדוגמה: טלפון ברכב, מחשב בבית)
              </label>
              <input
                type="text"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onCreateNew(newDeviceName);
                }}
                maxLength={32}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg bg-bg-primary border border-gray-600 text-text-primary focus:outline-none focus:border-accent"
                placeholder={suggestedName}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onCreateNew(newDeviceName)}
                  className="flex-1 min-h-[44px] bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  צור פרופיל חדש
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="min-h-[44px] px-4 py-2 rounded-lg bg-bg-primary text-text-secondary hover:text-text-primary text-sm"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeviceRecoveryModal;
