import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import { config } from '../../app/config';
import { Card } from '../ui/Card/Card';
import {
  Region,
  RegionSource,
  REGION_NAMES,
  REGION_SOURCE_LABELS,
  REGIONS,
} from '../../helpers/region';

interface RegionPickerProps {
  region: Region | null;
  // Null when the region was picked by the user rather than detected
  source: RegionSource | null;
  onChange: (region: Region) => void;
}

export const RegionPicker = ({ region, source, onChange }: RegionPickerProps) => {
  const [isEditing, setIsEditing] = useState(false);
  // Detection came up empty: better to ask than to silently guess
  const showPills = isEditing || region === null;

  return (
    <Card className="flex flex-row flex-wrap items-center gap-3 py-3 text-sm">
      <span className="flex-none text-slate-500 dark:text-slate-400">
        {showPills ? t('Host near') : t('Hosted in')}
      </span>

      {showPills ? (
        <>
          <div
            className="flex flex-grow flex-row gap-2"
            role="group"
            aria-label={t('Choose hosting region')}
          >
            {REGIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={region === option}
                onClick={() => {
                  onChange(option);
                  setIsEditing(false);
                }}
                className={`flex-grow rounded-md border px-3 py-2 font-semibold transition-colors ${
                  region === option
                    ? `${config.accentBorderClassName} ${config.accentClassName}`
                    : 'border-slate-300 hover:border-slate-400 dark:border-slate-600 dark:hover:border-slate-500'
                }`}
              >
                {t(REGION_NAMES[option])}
              </button>
            ))}
          </div>
          <p className="w-full text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t(
              'Pick the region closer to where you usually live — even if you are traveling right now. Closer means faster, every day.'
            )}
          </p>
        </>
      ) : (
        <>
          <span className="font-semibold">
            {t(REGION_NAMES[region])}
            {source ? (
              <span className="font-normal text-slate-500 dark:text-slate-400">
                {' '}
                · {t(REGION_SOURCE_LABELS[source])}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={`ml-auto font-semibold underline-offset-2 hover:underline ${config.accentClassName}`}
          >
            {t('Change')}
          </button>
        </>
      )}
    </Card>
  );
};
