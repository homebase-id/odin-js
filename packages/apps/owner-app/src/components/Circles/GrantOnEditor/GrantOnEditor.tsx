import { useState } from 'react';
import {
  ActionButton,
  ActionButtonState,
  Alert,
  ErrorNotification,
  Select,
  t,
  useCircle,
} from '@homebase-id/common-app';
import { CircleDefinition, CircleGrantOn } from '@homebase-id/js-lib/network';
import { GRANT_ON_HINTS, GRANT_ON_LABELS } from '../../Apps/AppOverviewParts';
import { useCircleEnrollmentCandidates } from '../../../hooks/apps/useEnrollmentCandidates';
import { EnrollCandidatesDialog } from '../EnrollCandidatesDialog/EnrollCandidatesDialog';

/**
 * Changes when a circle is granted, and offers to reconcile the people the new rule implies.
 *
 * Changing the rule is forward-looking: it decides how people get in from now on, and never
 * removes anyone who is already a member. So a change leaves a backlog -- everyone who would have
 * joined had the rule been set earlier -- and the whole point of putting this control here is that
 * the backlog is visible and actionable in the same place.
 *
 * Reconciliation is offered, not performed. For an ambient rule it would arguably be safe to do
 * automatically -- Connect circles are deposit-only, so they grant nothing a stranger should not
 * have -- but "I changed a setting and it added fifty people" is a surprise regardless of whether
 * the grant was harmless.
 */
export const GrantOnEditor = ({
  circle,
  isSystemCircle,
}: {
  circle: CircleDefinition;
  isSystemCircle: boolean;
}) => {
  const {
    createOrUpdate: { mutateAsync: updateCircle, error: updateError },
  } = useCircle();
  const {
    fetch: { data: offer },
  } = useCircleEnrollmentCandidates(circle.id);

  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState<CircleGrantOn | undefined>();
  const [state, setState] = useState<ActionButtonState>('idle');
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);

  const current = circle.grantOn ?? CircleGrantOn.None;
  const waiting = offer?.candidates?.length ?? 0;

  // A built-in circle's rule is declared in the app tree and re-applied on every version upgrade,
  // so editing it here would be undone without warning. Better to say so than to offer it.
  if (isSystemCircle || circle.appId) {
    return (
      <>
        {GRANT_ON_LABELS[current] ?? current}
        <ReconcileOffer
          waiting={waiting}
          onOpen={() => setIsReconcileOpen(true)}
          circle={circle}
          isOpen={isReconcileOpen}
          onClose={() => setIsReconcileOpen(false)}
        />
      </>
    );
  }

  if (!isEditing) {
    return (
      <>
        <span className="flex flex-row flex-wrap items-center gap-2">
          {GRANT_ON_LABELS[current] ?? current}
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => {
              setPending(current);
              setIsEditing(true);
            }}
          >
            {t('Change')}
          </button>
        </span>
        <ReconcileOffer
          waiting={waiting}
          onOpen={() => setIsReconcileOpen(true)}
          circle={circle}
          isOpen={isReconcileOpen}
          onClose={() => setIsReconcileOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ErrorNotification error={updateError} />

      {/* OwnFlowConnect is omitted on purpose: it means "only through this app's own consent
          flow", which is the app's business to declare, not a value an owner picks. */}
      <Select
        defaultValue={String(pending ?? current)}
        onChange={(e) => setPending(e.target.value as CircleGrantOn)}
      >
        <option value={CircleGrantOn.None}>{GRANT_ON_LABELS[CircleGrantOn.None]}</option>
        <option value={CircleGrantOn.Connect}>{GRANT_ON_LABELS[CircleGrantOn.Connect]}</option>
        <option value={CircleGrantOn.Review}>{GRANT_ON_LABELS[CircleGrantOn.Review]}</option>
      </Select>

      <p className="max-w-prose text-sm text-slate-400">{GRANT_ON_HINTS[pending ?? current]}</p>

      {/* The server refuses an ambient rule on a circle that grants Read or holds a permission
          key -- ambient circles are write/react only. Said here rather than left to a 400. */}
      {pending === CircleGrantOn.Connect ? (
        <Alert type="warning" isCompact={true}>
          {t(
            'An automatic circle may only grant write access, never read. If this circle grants read, the change will be refused.'
          )}
        </Alert>
      ) : null}

      <p className="max-w-prose text-sm text-slate-400">
        {t('This decides how people join from now on. Nobody already in the circle is removed.')}
      </p>

      <div className="flex flex-row gap-2">
        <ActionButton
          state={state}
          disabled={pending === current}
          onClick={async () => {
            setState('loading');
            try {
              await updateCircle({ ...circle, grantOn: pending });
              setState('success');
              setIsEditing(false);
            } catch {
              setState('error');
            }
          }}
        >
          {t('Save')}
        </ActionButton>
        <ActionButton type="secondary" onClick={() => setIsEditing(false)}>
          {t('Cancel')}
        </ActionButton>
      </div>
    </div>
  );
};

/**
 * Who the new rule implies but does not yet include.
 *
 * Named rather than counted at the point of acting: the panel lists them, so the owner sees the
 * people before agreeing, not a number.
 */
const ReconcileOffer = ({
  waiting,
  onOpen,
  circle,
  isOpen,
  onClose,
}: {
  waiting: number;
  onOpen: () => void;
  circle: CircleDefinition;
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!waiting) return null;

  return (
    <>
      <p className="mt-1 text-sm text-slate-400">
        {waiting} {waiting === 1 ? t('contact matches') : t('contacts match')}{' '}
        {t('this rule but are not in the circle.')}{' '}
        <button type="button" className="text-primary hover:underline" onClick={onOpen}>
          {t('Review and add')}
        </button>
      </p>

      <EnrollCandidatesDialog circle={circle} isOpen={isOpen} onClose={onClose} />
    </>
  );
};

export default GrantOnEditor;
