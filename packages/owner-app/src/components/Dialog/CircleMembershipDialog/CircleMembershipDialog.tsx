import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Arrow, t } from '@youfoundation/common-app';
import { useCircle } from '@youfoundation/common-app';
import { usePortal } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { CircleSelector } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import { CircleGrant, stringGuidsEqual } from '@youfoundation/js-lib';

const CircleMembershipDialog = ({
  title,
  isOpen,

  currentCircleGrants,
  odinId,

  onConfirm,
  onCancel,
}: {
  title: string;
  isOpen: boolean;

  currentCircleGrants: CircleGrant[];
  odinId: string;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  const {
    provideGrant: { mutateAsync: provideGrant, error: errorProviderGrant },
    revokeGrant: { mutateAsync: revokeGrant, error: errorRevokeGrant },
  } = useCircle({});
  const currentCircleGrantIds = currentCircleGrants.map((grant) => grant.circleId);
  const [newGrantIds, setNewGrantIds] = useState(currentCircleGrantIds);

  useEffect(() => {
    setNewGrantIds(currentCircleGrants.map((grant) => grant.circleId));
  }, [currentCircleGrants]);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper title={title} onClose={onCancel}>
      <>
        <ErrorNotification error={errorProviderGrant} />
        <ErrorNotification error={errorRevokeGrant} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();

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

export default CircleMembershipDialog;
