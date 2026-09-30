import { t } from '@homebase-id/common-app';
import type { CardAudience } from '../useCardData';

export const AudienceChip = ({ audience }: { audience?: CardAudience }) => {
  if (!audience) return null;
  const text = audience.kind === 'public' ? t('Public') : audience.label;
  if (!text) return null;
  return (
    <span
      className="pointer-events-none absolute start-3 top-3 z-10 max-w-[50%] truncate rounded-full border px-2 py-0.5 text-[11px] leading-4"
      style={{ color: 'var(--card-muted)', borderColor: 'var(--card-muted)' }}
    >
      {text}
    </span>
  );
};
