import React, { useState, useEffect } from 'react';
import { DimLevel, DimWakeMode } from '../../types/settings';
import ToggleSwitch from './ToggleSwitch';
import SettingsButton from './SettingsButton';

interface ScreenProtectionSettingsProps {
  isWakeLockEnabled: boolean;
  onWakeLockEnabledChange: (enabled: boolean) => void;
  isPixelShiftEnabled: boolean;
  onPixelShiftEnabledChange: (enabled: boolean) => void;
  autoDimSeconds: number;
  onAutoDimSecondsChange: (seconds: number) => void;
  dimLevel: DimLevel;
  dimOpacity: number;
  onDimPresetSelect: (level: DimLevel, opacity: number) => void;
  onDimOpacityChange: (opacity: number) => void;
  isPreviewingDim: boolean;
  onTogglePreviewDim: () => void;
  onSliderPreviewStart: () => void;
  onSliderPreviewEnd: () => void;
  dimWakeMode: DimWakeMode;
  onDimWakeModeChange: (mode: DimWakeMode) => void;
  emergencyTimeoutMinutes: number;
  onEmergencyTimeoutMinutesChange: (minutes: number) => void;
}

const AUTO_DIM_PRESETS = [
  { label: 'כבוי', value: 0 },
  { label: "30 ש'", value: 30 },
  { label: "1 דק'", value: 60 },
  { label: "2 דק'", value: 120 },
  { label: "5 דק'", value: 300 },
];

const EMERGENCY_PRESETS = [
  { label: 'כבוי', value: 0 },
  { label: "10 דק'", value: 10 },
  { label: "15 דק'", value: 15 },
  { label: "30 דק'", value: 30 },
];

const DIM_PRESET_BUTTONS: { value: Exclude<DimLevel, 'custom'>; opacity: number; label: string }[] = [
  { value: 'light', opacity: 30, label: 'קל (30%)' },
  { value: 'balanced', opacity: 55, label: 'מאוזן (מומלץ)' },
  { value: 'deep', opacity: 75, label: 'עמוק (75%)' },
  { value: 'warm', opacity: 65, label: 'לילה חם' },
];

const getDimRecommendation = (dimLevel: DimLevel, dimOpacity: number): { text: string; className: string } => {
  if (dimOpacity < 40) {
    return {
      text: `הגנה חלקית (${dimOpacity}%): קריאות גבוהה, אך עלול לא להספיק למניעת צריבת מסך בשימוש ממושך.`,
      className: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
    };
  }
  if (dimLevel === 'warm') {
    return {
      text: `מומלץ לחושך (${dimOpacity}%): סינון אור כחול והחשכה מאוזנת להקלה על העיניים ושמירה על המסך.`,
      className: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200',
    };
  }
  if (dimOpacity <= 65) {
    return {
      text: `מומלץ (${dimOpacity}%): איזון מיטבי בין שמירה על תקינות המסך לבין קריאות ותפעול נוח ברכב.`,
      className: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
    };
  }
  return {
    text: `הגנה מרבית (${dimOpacity}%): חוסך סוללה ומונע סנוור בנסיעות ארוכות ובלילה (הממשק נשאר גלוי).`,
    className: 'bg-sky-500/15 border-sky-500/40 text-sky-200',
  };
};

const ScreenProtectionSettings: React.FC<ScreenProtectionSettingsProps> = ({
  isWakeLockEnabled,
  onWakeLockEnabledChange,
  isPixelShiftEnabled,
  onPixelShiftEnabledChange,
  autoDimSeconds,
  onAutoDimSecondsChange,
  dimLevel,
  dimOpacity,
  onDimPresetSelect,
  onDimOpacityChange,
  isPreviewingDim,
  onTogglePreviewDim,
  onSliderPreviewStart,
  onSliderPreviewEnd,
  dimWakeMode,
  onDimWakeModeChange,
  emergencyTimeoutMinutes,
  onEmergencyTimeoutMinutesChange,
}) => {
  const isDimPreset = AUTO_DIM_PRESETS.some(p => p.value === autoDimSeconds);
  const [isCustomDimOpen, setIsCustomDimOpen] = useState(!isDimPreset);
  const [customDimDraft, setCustomDimDraft] = useState(String(autoDimSeconds > 0 ? autoDimSeconds : 45));

  const isEmergencyPreset = EMERGENCY_PRESETS.some(p => p.value === emergencyTimeoutMinutes);
  const [isCustomEmergencyOpen, setIsCustomEmergencyOpen] = useState(!isEmergencyPreset);
  const [customEmergencyDraft, setCustomEmergencyDraft] = useState(String(emergencyTimeoutMinutes > 0 ? emergencyTimeoutMinutes : 20));

  useEffect(() => {
    if (!AUTO_DIM_PRESETS.some(p => p.value === autoDimSeconds)) {
      setIsCustomDimOpen(true);
      setCustomDimDraft(String(autoDimSeconds));
    }
  }, [autoDimSeconds]);

  useEffect(() => {
    if (!EMERGENCY_PRESETS.some(p => p.value === emergencyTimeoutMinutes)) {
      setIsCustomEmergencyOpen(true);
      setCustomEmergencyDraft(String(emergencyTimeoutMinutes));
    }
  }, [emergencyTimeoutMinutes]);

  const handleApplyCustomDim = () => {
    const parsed = parseInt(customDimDraft, 10);
    if (isNaN(parsed) || parsed <= 0) {
      onAutoDimSecondsChange(0);
      setIsCustomDimOpen(false);
      return;
    }
    const clamped = Math.min(3600, Math.max(10, parsed));
    setCustomDimDraft(String(clamped));
    onAutoDimSecondsChange(clamped);
  };

  const handleApplyCustomEmergency = () => {
    const parsed = parseInt(customEmergencyDraft, 10);
    if (isNaN(parsed) || parsed <= 0) {
      onEmergencyTimeoutMinutesChange(0);
      setIsCustomEmergencyOpen(false);
      return;
    }
    const clamped = Math.min(180, Math.max(1, parsed));
    setCustomEmergencyDraft(String(clamped));
    onEmergencyTimeoutMinutesChange(clamped);
  };

  const recommendation = getDimRecommendation(dimLevel, dimOpacity);

  return (
    <div className="space-y-3">
      <ToggleSwitch
        label="שמור על מסך דולק בזמן פעילות"
        enabled={isWakeLockEnabled}
        onChange={onWakeLockEnabledChange}
      />

      <div className="space-y-1">
        <ToggleSwitch
          label="תזוזת פיקסלים למניעת צריבה"
          enabled={isPixelShiftEnabled}
          onChange={onPixelShiftEnabledChange}
        />
        <p className="text-[11px] text-text-secondary px-3 leading-snug">
          הזזה זעירה ובלתי מורגשת מדי 4 דקות (בזמן ניגון והמתנה) לשמירה על תקינות המסך.
        </p>
      </div>

      {/* Auto-Dim Timing */}
      <div className="p-3 rounded-lg bg-bg-primary space-y-2">
        <div className="flex justify-between items-center text-sm font-medium text-text-primary">
          <span>עמעום אוטומטי בחוסר מגע</span>
          <span className="text-xs text-accent">
            {autoDimSeconds === 0 ? 'כבוי' : autoDimSeconds >= 60 && autoDimSeconds % 60 === 0 ? `${autoDimSeconds / 60} דק'` : `${autoDimSeconds} ש'`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {AUTO_DIM_PRESETS.map(preset => (
            <SettingsButton
              key={preset.value}
              label={preset.label}
              isActive={!isCustomDimOpen && autoDimSeconds === preset.value}
              onClick={() => {
                setIsCustomDimOpen(false);
                onAutoDimSecondsChange(preset.value);
              }}
            />
          ))}
          <SettingsButton
            label="ידני"
            isActive={isCustomDimOpen || !isDimPreset}
            onClick={() => {
              setIsCustomDimOpen(true);
              if (autoDimSeconds > 0) setCustomDimDraft(String(autoDimSeconds));
            }}
          />
        </div>
        {isCustomDimOpen && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={3600}
              value={customDimDraft}
              onChange={(e) => setCustomDimDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustomDim(); }}
              className="w-20 px-2 py-1.5 text-sm rounded bg-bg-secondary border border-gray-600 text-text-primary text-center focus:outline-none focus:border-accent"
              aria-label="זמן עמעום בשניות"
            />
            <span className="text-xs text-text-secondary">שניות (10–3600)</span>
            <button
              type="button"
              onClick={handleApplyCustomDim}
              className="mr-auto px-3 py-1.5 text-xs font-semibold rounded bg-accent hover:bg-accent-hover text-white transition-colors"
            >
              החל
            </button>
          </div>
        )}
      </div>

      {/* Dim Level, Manual Slider & Live Preview (when auto-dim is enabled) */}
      {autoDimSeconds > 0 && (
        <>
          <div className="p-3 rounded-lg bg-bg-primary space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">סוג ועוצמת העמעום</span>
              <button
                type="button"
                onClick={onTogglePreviewDim}
                aria-pressed={isPreviewingDim}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                  isPreviewingDim
                    ? 'bg-accent text-white border-accent'
                    : 'bg-accent/20 hover:bg-accent/35 text-accent border-accent/40'
                }`}
              >
                {isPreviewingDim ? '✕ סגור תצוגה' : '👁️ תצוגה מקדימה'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {DIM_PRESET_BUTTONS.map(option => (
                <SettingsButton
                  key={option.value}
                  label={option.label}
                  isActive={dimLevel === option.value && dimOpacity === option.opacity}
                  onClick={() => onDimPresetSelect(option.value, option.opacity)}
                />
              ))}
            </div>

            {/* Compact Manual Opacity Slider (1% precision + live preview while adjusting) */}
            <div className="pt-1 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-secondary">כיוון ידני</span>
                <span className="font-semibold text-accent">{dimOpacity}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={80}
                step={1}
                value={dimOpacity}
                onPointerDown={onSliderPreviewStart}
                onPointerUp={onSliderPreviewEnd}
                onPointerCancel={onSliderPreviewEnd}
                onTouchStart={onSliderPreviewStart}
                onTouchEnd={onSliderPreviewEnd}
                onKeyDown={(e) => {
                  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                    onSliderPreviewStart();
                  }
                }}
                onKeyUp={onSliderPreviewEnd}
                onBlur={onSliderPreviewEnd}
                onChange={(e) => onDimOpacityChange(parseInt(e.target.value, 10))}
                className="w-full accent-teal-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                aria-label="עוצמת עמעום ידנית"
              />
            </div>

            <div className={`p-2 rounded border text-[11px] leading-snug ${recommendation.className}`}>
              {recommendation.text}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-bg-primary space-y-2">
            <span className="block text-sm font-medium text-text-primary">ביטול עמעום בנגיעה</span>
            <div className="grid grid-cols-2 gap-1.5">
              <SettingsButton
                label="נגיעה אחת"
                isActive={dimWakeMode === 'singleTap'}
                onClick={() => onDimWakeModeChange('singleTap')}
              />
              <SettingsButton
                label="שתי נגיעות"
                isActive={dimWakeMode === 'doubleTap'}
                onClick={() => onDimWakeModeChange('doubleTap')}
              />
            </div>
            <p className="text-[11px] text-text-secondary leading-snug">
              {dimWakeMode === 'singleTap'
                ? 'לחיצה בזמן עמעום תאיר את המסך ותפעיל את התחנה או הכפתור מיד באותה נגיעה.'
                : 'נגיעה ראשונה רק תעיר את המסך, והנגיעה השנייה תפעיל כפתורים (למניעת לחיצה בטעות).'}
            </p>
          </div>
        </>
      )}

      {/* Emergency Idle Timeout (No Playback Only) */}
      <div className="p-3 rounded-lg bg-bg-primary space-y-2">
        <div className="flex justify-between items-center text-sm font-medium text-text-primary">
          <span>כיבוי חירום (ללא ניגון)</span>
          <span className="text-xs text-accent">
            {emergencyTimeoutMinutes === 0 ? 'כבוי' : `${emergencyTimeoutMinutes} דק'`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {EMERGENCY_PRESETS.map(preset => (
            <SettingsButton
              key={preset.value}
              label={preset.label}
              isActive={!isCustomEmergencyOpen && emergencyTimeoutMinutes === preset.value}
              onClick={() => {
                setIsCustomEmergencyOpen(false);
                onEmergencyTimeoutMinutesChange(preset.value);
              }}
            />
          ))}
          <SettingsButton
            label="ידני"
            isActive={isCustomEmergencyOpen || !isEmergencyPreset}
            onClick={() => {
              setIsCustomEmergencyOpen(true);
              if (emergencyTimeoutMinutes > 0) setCustomEmergencyDraft(String(emergencyTimeoutMinutes));
            }}
          />
        </div>
        {isCustomEmergencyOpen && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={customEmergencyDraft}
              onChange={(e) => setCustomEmergencyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCustomEmergency(); }}
              className="w-20 px-2 py-1.5 text-sm rounded bg-bg-secondary border border-gray-600 text-text-primary text-center focus:outline-none focus:border-accent"
              aria-label="זמן כיבוי חירום בדקות"
            />
            <span className="text-xs text-text-secondary">דקות (1–180)</span>
            <button
              type="button"
              onClick={handleApplyCustomEmergency}
              className="mr-auto px-3 py-1.5 text-xs font-semibold rounded bg-accent hover:bg-accent-hover text-white transition-colors"
            >
              החל
            </button>
          </div>
        )}
        <p className="text-[11px] text-text-secondary leading-snug">
          פועל רק כשאין ניגון פעיל: משחרר את שמירת המסך כדי שהמכשיר יכבה אותו אוטומטית.
        </p>
      </div>
    </div>
  );
};

export default ScreenProtectionSettings;
