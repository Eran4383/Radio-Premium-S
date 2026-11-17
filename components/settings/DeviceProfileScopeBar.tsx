import React from 'react';
import {
  DETECTED_DEVICE_LABELS,
  DetectedDeviceType,
  DeviceProfile,
  SettingsEditScope,
} from '../../types/settings';
import TouchTooltip from './TouchTooltip';

interface DeviceProfileScopeBarProps {
  editScope: SettingsEditScope;
  onEditScopeChange: (scope: SettingsEditScope) => void;
  activeDeviceId: string | null;
  deviceProfiles: Record<string, DeviceProfile>;
  detectedDevice: DetectedDeviceType;
  overriddenCount: number;
  onResetAllOverrides: (deviceId: string) => void;
}

const DEVICE_TYPES: DetectedDeviceType[] = ['mobile', 'tablet', 'desktop'];

const DeviceProfileScopeBar: React.FC<DeviceProfileScopeBarProps> = ({
  editScope,
  onEditScopeChange,
  activeDeviceId,
  deviceProfiles,
  detectedDevice,
  overriddenCount,
  onResetAllOverrides,
}) => {
  const activeProfile = activeDeviceId ? deviceProfiles[activeDeviceId] || null : null;
  const targetProfile =
    editScope.kind === 'device' ? deviceProfiles[editScope.deviceId] || activeProfile : activeProfile;
  const isEditingRemoteDevice =
    editScope.kind === 'device' && targetProfile && targetProfile.id !== activeDeviceId;

  const deviceLabel = targetProfile?.name || DETECTED_DEVICE_LABELS[detectedDevice] || 'מכשיר זה';

  const thisDeviceButtonLabel = isEditingRemoteDevice
    ? `במכשיר ${deviceLabel}`
    : 'רק במכשיר זה';

  const thisDeviceTooltip = isEditingRemoteDevice
    ? `השינויים יישמרו רק עבור המכשיר "${deviceLabel}".`
    : `שינויים באקולייזר, בממשק ובהגנת המסך יישמרו רק עבור מכשיר זה (${deviceLabel}), ולא ישפיעו על מכשירים אחרים שלך.`;

  const generalDefaultTooltip =
    'קובע הגדרות ברירת מחדל לכל המכשירים מאותו סוג (כל הטלפונים, כל הטאבלטים או כל המחשבים), כל עוד לא הותאמו אישית במכשיר מסוים.';

  const headerTooltip =
    'בחר אם השינויים בחלקים שלמטה יחולו רק על המכשיר הזה, או ישמשו כברירת מחדל לכל המכשירים מאותו סוג (טלפון / טאבלט / מחשב).';

  return (
    <div className="mb-3 pt-2 border-t border-gray-700/35 space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] text-text-secondary truncate">
            {editScope.kind === 'device'
              ? isEditingRemoteDevice
                ? `עריכת הגדרות של ${deviceLabel}:`
                : 'שמור שינויים עבור:'
              : 'ברירת מחדל לפי סוג מכשיר:'}
          </span>
          <TouchTooltip content={headerTooltip} align="center" className="inline-flex">
            <span
              tabIndex={0}
              aria-label="מידע על שמירת הגדרות לפי מכשיר"
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-bg-primary text-text-secondary border border-gray-600/60 hover:text-accent hover:border-accent/50 cursor-help select-none"
            >
              ?
            </span>
          </TouchTooltip>
        </div>

        {isEditingRemoteDevice && activeDeviceId && (
          <button
            type="button"
            onClick={() => onEditScopeChange({ kind: 'device', deviceId: activeDeviceId })}
            className="text-[11px] text-accent hover:underline flex-shrink-0"
          >
            חזור למכשיר זה
          </button>
        )}
      </div>

      {/* Slim, low-profile scope switcher with hover & long-press tooltips */}
      <div className="grid grid-cols-2 gap-1 p-0.5 bg-bg-primary/80 rounded-lg border border-gray-700/40">
        <TouchTooltip content={thisDeviceTooltip} align="start">
          <button
            type="button"
            onClick={() => {
              const targetId = targetProfile?.id || activeDeviceId;
              if (targetId) onEditScopeChange({ kind: 'device', deviceId: targetId });
            }}
            className={`w-full py-1.5 px-2 text-xs rounded-md transition-colors truncate ${
              editScope.kind === 'device'
                ? 'bg-bg-secondary text-accent border border-accent/40 font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {thisDeviceButtonLabel}
          </button>
        </TouchTooltip>

        <TouchTooltip content={generalDefaultTooltip} align="end">
          <button
            type="button"
            onClick={() =>
              onEditScopeChange({
                kind: 'type',
                deviceType: targetProfile?.deviceType || detectedDevice,
              })
            }
            className={`w-full py-1.5 px-2 text-xs rounded-md transition-colors truncate ${
              editScope.kind === 'type'
                ? 'bg-bg-secondary text-accent border border-accent/40 font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            ברירת מחדל כללית
          </button>
        </TouchTooltip>
      </div>

      {editScope.kind === 'type' ? (
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-1">
            {DEVICE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onEditScopeChange({ kind: 'type', deviceType: type })}
                className={`py-1 px-2 text-[11px] rounded-md transition-colors ${
                  editScope.deviceType === type
                    ? 'bg-accent/20 text-accent font-semibold border border-accent/35'
                    : 'bg-bg-primary/60 text-text-secondary hover:text-text-primary'
                }`}
              >
                {DETECTED_DEVICE_LABELS[type]}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-secondary/85 px-0.5 leading-snug">
            חל כבסיס על כל מכשירי ה{DETECTED_DEVICE_LABELS[editScope.deviceType]} (מכשיר שהותאם אישית שומר על הגדרותיו).
          </p>
        </div>
      ) : overriddenCount > 0 && targetProfile ? (
        <div className="flex items-center justify-between gap-2 px-0.5 text-[11px] text-amber-300/90">
          <span>
            {isEditingRemoteDevice
              ? `${overriddenCount} התאמות אישיות ב-${deviceLabel}`
              : `${overriddenCount} התאמות אישיות במכשיר זה`}
          </span>
          <button
            type="button"
            onClick={() => onResetAllOverrides(targetProfile.id)}
            className="text-accent hover:underline font-medium flex-shrink-0"
          >
            אפס הכל
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default DeviceProfileScopeBar;
