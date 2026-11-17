import React from 'react';
import { DeviceScopedSettingKey } from '../../types/settings';

interface OverrideHintProps {
  settingKey: DeviceScopedSettingKey;
  isOverridden: boolean;
  onResetKey?: (key: DeviceScopedSettingKey) => void;
}

const OverrideHint: React.FC<OverrideHintProps> = ({
  settingKey,
  isOverridden,
  onResetKey,
}) => {
  if (!isOverridden || !onResetKey) return null;

  return (
    <div className="flex items-center justify-between text-[11px] text-amber-300/90 px-2 pt-0.5">
      <span>מותאם אישית למכשיר זה</span>
      <button
        type="button"
        onClick={() => onResetKey(settingKey)}
        className="text-accent hover:underline font-medium"
      >
        איפוס
      </button>
    </div>
  );
};

export default OverrideHint;
