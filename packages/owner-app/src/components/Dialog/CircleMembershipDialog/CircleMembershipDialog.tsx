import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ActionButtonState, Arrow, t } from '@youfoundation/common-app';
import { useCircle } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { CircleSelector } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';
import { CircleGrant } from '@youfoundation/js-lib/network';

interface InnerCircleSelectionDialogProps {
  title: string;
  isOpen: boolean;

  currentCircleGrantIds: string[];
  error: unknown;

  onConfirm: (newGrantIds: string[]) => void;
  onCancel: () => void;
}

export const CircleMembershipDialog = ({
  odinId,

  title,
  isOpen,
  currentCircleGrants,
  onConfirm,
  onCancel,
}: {
  odinId: string;

  title: string;
  isOpen: boolean;

  currentCircleGrants: CircleGrant[];
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const {
    provideGrant: { mutateAsync: provideGrant, error: errorProviderGrant },
    revokeGrant: { mutateAsync: revokeGrant, error: errorRevokeGrant },
  } = useCircle({});

  const currentCircleGrantIds = currentCircleGrants.map((grant) => grant.circleId);

  return (
    <InnerCircleSelectionDialog
      title={title}
      isOpen={isOpen}
      error={errorProviderGrant || errorRevokeGrant}
      onCancel={onCancel}
      currentCircleGrantIds={currentCircleGrantIds}
      onConfirm={async (newGrantIds) => {
        const toProvideGrants = newGrantIds.filter(
          (newGrant) =>
            !currentCircleGrantIds.some((grantId) => stringGuidsEqual(newGrant, grantId))
        );
        const toRevokeGrants = currentCircleGrantIds.filter(
          (oldGrant) => !newGrantIds.some((newGrant) => stringGuidsEqual(oldGrant, newGrant))
        );

        for (const circleToProvide of toProvideGrants) {
          await provideGrant({ circleId: circleToProvide, odinId: odinId });
        }

        for (const circleToRevoke of toRevokeGrants) {
          await revokeGrant({ circleId: circleToRevoke, odinId: odinId });
        }

        onConfirm();
      }}
    />
  );
};

export const CircleDomainMembershipDialog = ({
  domain,

  title,
  isOpen,
  currentCircleGrants,
  onConfirm,
  onCancel,
}: {
  domain: string;

  title: string;
  isOpen: boolean;

  currentCircleGrants: CircleGrant[];
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const {
    provideDomainGrant: { mutateAsync: provideGrant, error: errorProviderGrant },
    revokeDomainGrant: { mutateAsync: revokeGrant, error: errorRevokeGrant },
  } = useCircle({});

  const currentCircleGrantIds = currentCircleGrants.map((grant) => grant.circleId);

  return (
    <InnerCircleSelectionDialog
      title={title}
      isOpen={isOpen}
      error={errorProviderGrant || errorRevokeGrant}
      onCancel={onCancel}
      currentCircleGrantIds={currentCircleGrantIds}
      onConfirm={async (newGrantIds) => {
        const toProvideGrants = newGrantIds.filter(
          (newGrant) =>
            !currentCircleGrantIds.some((grantId) => stringGuidsEqual(newGrant, grantId))
        );
        const toRevokeGrants = currentCircleGrantIds.filter(
          (oldGrant) => !newGrantIds.some((newGrant) => stringGuidsEqual(oldGrant, newGrant))
        );

        for (const circleToProvide of toProvideGrants) {
          await provideGrant({ circleId: circleToProvide, domain: domain });
        }

        for (const circleToRevoke of toRevokeGrants) {
          await revokeGrant({ circleId: circleToRevoke, domain: domain });
        }

        onConfirm();
      }}
    />
  );
};

const InnerCircleSelectionDialog = ({
  title,
  isOpen,

  currentCircleGrantIds,
  error,

  onConfirm,
  onCancel,
}: InnerCircleSelectionDialogProps) => {
  const target = usePortal('modal-container');

  const [newGrantIds, setNewGrantIds] = useState(currentCircleGrantIds);

  useEffect(() => {
    setNewGrantIds(currentCircleGrantIds);
  }, [currentCircleGrantIds]);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <>
        <ErrorNotification error={error} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            onConfirm(newGrantIds);
          }}
        >
          <h2 className="mb-2 text-lg">{t('Member of')}:</h2>
          <CircleSelector
            defaultValue={newGrantIds}
            onChange={(e) => setNewGrantIds(e.target.value)}
          />

          <div className="-m-2 flex flex-row-reverse py-3">
            <ActionButton className="m-2" icon={Arrow}>
              {t('Save')}
            </ActionButton>
            <ActionButton className="m-2" type="secondary" onClick={onCancel}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
