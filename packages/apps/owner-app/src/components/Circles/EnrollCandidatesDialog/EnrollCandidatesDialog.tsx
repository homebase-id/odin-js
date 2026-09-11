import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionButton,
  ActionButtonState,
  Alert,
  CheckboxToggle,
  ContactName,
  DialogWrapper,
  ErrorNotification,
  t,
  usePortal,
  formatDateExludingYearIfCurrent,
} from '@homebase-id/common-app';
import { Loader, Check, Times } from '@homebase-id/common-app/icons';
import {
  CircleDefinition,
  EnrollmentCandidate,
  EnrollmentResult,
} from '@homebase-id/js-lib/network';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { useEnrollmentCandidates } from '../../../hooks/apps/useEnrollmentCandidates';
import DrivePermissionView from '../../PermissionViews/DrivePermissionView/DrivePermissionView';

/**
 * Review before adding: who would be added, why they qualify, and what the circle gives them.
 *
 * Replaces a bare "add them" link that granted circle membership to everyone at once with no list
 * and no confirmation.  Circle membership is drive access -- for a Read circle the drive's storage
 * key is escrowed to the member -- so revoking later stops future reads but does not recall what
 * was already readable.  That makes this closer to disclosure than to a toggle, and disclosure
 * needs to be looked at before it happens.
 *
 * A side panel rather than a modal because it is a list to work through, and because it is how the
 * rest of the console asks for this kind of decision.
 */
export const EnrollCandidatesDialog = ({
  appId,
  circle,
  isOpen,
  onClose,
}: {
  appId?: string;
  circle: CircleDefinition;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const target = usePortal('modal-container');
  const {
    fetch: { data: allCandidates, isLoading },
    enrollAll: { mutateAsync: enrollAll, error: enrollError },
  } = useEnrollmentCandidates(appId);

  // stringGuidsEqual, never ===: guid formatting differs between what the server returns and what
  // the client holds, so a strict compare finds nothing here while the prompt that opened this
  // panel -- which does compare properly -- confidently reports a count.
  const offer = allCandidates?.find((c) => stringGuidsEqual(c.circleId, circle.id));
  const candidates = offer?.candidates ?? [];

  // Nobody starts selected. Granting circle membership escrows a drive's storage key to each
  // member, and removing them later does not undo that -- so the owner picks who, rather than
  // confirming a selection the screen made on their behalf. Select-all is there for when the
  // answer really is everyone.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [state, setState] = useState<ActionButtonState>('idle');
  const [result, setResult] = useState<EnrollmentResult | undefined>();

  if (!isOpen) return null;

  const selected = candidates.filter((c) => selectedIds.includes(c.odinId));
  const allSelected = candidates.length > 0 && selected.length === candidates.length;

  const dialog = (
    <DialogWrapper
      title={`${t('Add contacts to')} "${circle.name}"`}
      onClose={onClose}
      size="large"
    >
      <ErrorNotification error={enrollError} />

      {result ? (
        <Completion result={result} circle={circle} onClose={onClose} />
      ) : isLoading ? (
        <p className="flex flex-row items-center gap-2 text-slate-400">
          <Loader className="h-5 w-5" /> {t('Checking who is eligible...')}
        </p>
      ) : !candidates.length ? (
        <p className="text-slate-400">{t('Everyone eligible is already in this circle.')}</p>
      ) : (
        <>
          <WhatTheyGain circle={circle} />

          <div className="mb-3 mt-5 flex flex-row items-center justify-between">
            <p className="font-semibold">
              {selected.length} {t('of')} {candidates.length} {t('selected')}
            </p>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => setSelectedIds(allSelected ? [] : candidates.map((c) => c.odinId))}
            >
              {allSelected ? t('Select none') : t('Select all')}
            </button>
          </div>

          <ul className="flex flex-col gap-1">
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.odinId}
                candidate={candidate}
                checked={selectedIds.includes(candidate.odinId)}
                onToggle={() =>
                  setSelectedIds((prev) =>
                    prev.includes(candidate.odinId)
                      ? prev.filter((id) => id !== candidate.odinId)
                      : [...prev, candidate.odinId]
                  )
                }
              />
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <ActionButton
              state={state}
              disabled={!selected.length}
              onClick={async () => {
                setState('loading');
                try {
                  const r = await enrollAll({
                    circleId: circle.id as string,
                    odinIds: selected.map((c) => c.odinId),
                  });
                  setResult(r);
                  setState('success');
                } catch {
                  setState('error');
                }
              }}
            >
              {/* The count and the access in the button itself: the two facts that make this a
                  decision rather than a click. */}
              {state === 'loading'
                ? t('Adding...')
                : selected.length === 0
                  ? t('Select contacts to add')
                  : `${t('Add')} ${selected.length} ${selected.length === 1 ? t('contact') : t('contacts')}`}
            </ActionButton>
            <ActionButton type="secondary" onClick={onClose}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </>
      )}
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

/** What membership actually confers. "Add to Mail Contacts" means nothing without this. */
const WhatTheyGain = ({ circle }: { circle: CircleDefinition }) => (
  <Alert type="info" isCompact={true}>
    <p className="mb-2 text-sm">{t('Members of this circle get:')}</p>
    {circle.driveGrants?.length ? (
      <div className="flex flex-col gap-1">
        {circle.driveGrants.map((grant, i) => (
          <DrivePermissionView key={i} driveGrant={grant} />
        ))}
      </div>
    ) : (
      <p className="text-sm text-slate-400">{t('No drive access')}</p>
    )}
  </Alert>
);

const CandidateRow = ({
  candidate,
  checked,
  onToggle,
}: {
  candidate: EnrollmentCandidate;
  checked: boolean;
  onToggle: () => void;
}) => (
  <li
    className="flex select-none flex-row items-center gap-3 rounded-lg border p-3 dark:border-slate-800"
    onClick={onToggle}
  >
    <CheckboxToggle checked={checked} className="pointer-events-none" readOnly={true} />
    <span className="flex flex-col">
      <ContactName odinId={candidate.odinId} canSave={false} />
      <span className="text-sm text-slate-400">
        {candidate.odinId}
        {/* Why this person is on the list at all. Lets the owner catch a review they would not
            make again, before it becomes access. */}
        {candidate.reviewedAt
          ? ` · ${t('reviewed')} ${formatDateExludingYearIfCurrent(new Date(candidate.reviewedAt))}`
          : ''}
      </span>
    </span>
  </li>
);

/**
 * What actually happened, per contact.
 *
 * Deposits are called out separately because they are not membership yet: the grant is recorded
 * and takes effect when the connection's key is next in scope. Skips are named because "which ones
 * did not go through" is the question, and a number cannot answer it.
 */
const Completion = ({
  result,
  circle,
  onClose,
}: {
  result: EnrollmentResult;
  circle: CircleDefinition;
  onClose: () => void;
}) => {
  const skipped = result.outcomes?.filter((o) => o.kind === 'skipped') ?? [];
  const deposited = result.outcomes?.filter((o) => o.kind === 'deposited') ?? [];

  return (
    <>
      <p className="mb-4 flex flex-row items-center gap-2 text-lg">
        <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        {result.enrolled} {result.enrolled === 1 ? t('contact was') : t('contacts were')}{' '}
        {t('added to')} &quot;{circle.name}&quot;
      </p>

      {deposited.length ? (
        <Alert type="info" isCompact={true} className="mb-3">
          <p className="text-sm">
            {deposited.length} {t('will join once their connection is next active.')}
          </p>
          <ul className="mt-1 text-sm text-slate-400">
            {deposited.map((o) => (
              <li key={o.odinId}>{o.odinId}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {skipped.length ? (
        <Alert type="warning" isCompact={true} className="mb-3">
          <p className="text-sm">
            {t('These were not added, because they stopped being eligible:')}
          </p>
          <ul className="mt-1 flex flex-col text-sm text-slate-400">
            {skipped.map((o) => (
              <li key={o.odinId} className="flex flex-row items-center gap-1">
                <Times className="h-4 w-4" /> {o.odinId}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {/* Undo exists and is worth naming, along with its limit: revoking stops future access, it
          does not recall what was already readable. */}
      <p className="mb-5 text-sm text-slate-400">
        {t(
          'To undo, remove them from the circle. That stops further access, but does not recall anything already read.'
        )}
      </p>

      <div className="flex flex-row-reverse">
        <ActionButton onClick={onClose}>{t('Done')}</ActionButton>
      </div>
    </>
  );
};

export default EnrollCandidatesDialog;
