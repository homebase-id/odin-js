import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusedEditing } from '../../../hooks/focusedEditing/useFocusedEditing';
import {
  t,
  CheckboxToggle,
  usePortal,
  ErrorNotification,
  ActionButton,
  DomainHighlighter,
  CircleSelector,
  DialogWrapper,
  useConnection,
  useCircle,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import { useAutoConnection } from '../../../hooks/connections/useAutoConnection';

const ConfirmConnectionDialog = ({
  odinId,
  isOpen,

  onConfirm,
  onCancel,
}: {
  odinId: string;
  isOpen: boolean;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const { data: connectionInfo } = useConnection({ odinId: odinId }).fetch;

  const {
    confirmAutoConnection: { mutate: confirmIntroduction, status: confirmIntroductionState },
  } = useAutoConnection({ odinId: odinId });

  const {
    provideGrant: { mutateAsync: provideGrant },
  } = useCircle();

  const checkReturnTo = useFocusedEditing();

  const [circleGrants, setCircleGrants] = useState<string[]>([]);
  const [shouldFollow, setShouldFollow] = useState(true);

  const [runningError, setRunningError] = useState<Error | unknown | null>(null);

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={
        <>
          {t('Confirm connection to')} <DomainHighlighter>{odinId}</DomainHighlighter>
        </>
      }
      onClose={() => {
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge"
    >
      <>
        <ErrorNotification error={runningError} />
        <>
          <form
            onSubmit={async (e) => {
              if (confirmIntroductionState === 'pending') return;
              e.preventDefault();
              try {
                await confirmIntroduction({
                  odinId: odinId,
                  autoFollow: shouldFollow,
                });

                // BE is slow at confirming the introduction, so we need to wait before providing grants
                await new Promise<void>((resolve) => setTimeout(() => resolve(), 1000));

                for (const circleToProvide of circleGrants) {
                  await provideGrant({ circleId: circleToProvide, odinId: odinId });
                }

                checkReturnTo('Approved');
                onConfirm();
              } catch (error) {
                setRunningError(error);
              }
            }}
          >
            <div className="mb-4">
              <p className="text-slate-400">
                {t('You were automatically connected to')} &quot;
                <DomainHighlighter>{odinId}</DomainHighlighter>&quot;{' '}
                {t('following an introduction by')} &quot;{connectionInfo?.introducerOdinId}
                &quot;. {t('To allow further access, please confirm this connection')}
              </p>
            </div>

            <div className="mb-4 pb-4">
              <h2 className="mb-2 text-lg leading-tight">
                {t('Add as a member to one or more circles')}:
                <small className="block text-slate-400 dark:text-slate-600">
                  {odinId} {t('will be added as member to the selected circles')}
                </small>
              </h2>
              <CircleSelector
                defaultValue={circleGrants}
                onChange={(e) => setCircleGrants(e.target.value)}
                excludeSystemCircles={true}
              />
            </div>

            <div
              className="flex cursor-pointer flex-row items-center rounded-lg border bg-white px-4 py-3 dark:border-slate-800 dark:bg-black"
              onClick={() => setShouldFollow(!shouldFollow)}
            >
              <h2 className="mr-auto text-lg leading-tight">
                {t('Follow')}
                <small className="block text-slate-400 dark:text-slate-600">
                  {t('View posts from')} &quot;{odinId}&quot; {t('in your feed')}
                </small>
              </h2>
              <CheckboxToggle
                className="pointer-events-none ml-2"
                checked={shouldFollow}
                readOnly={true}
              />
            </div>

            <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
              <ActionButton className="" icon={Arrow} state={confirmIntroductionState}>
                {t('Confirm')}
              </ActionButton>
              <ActionButton
                className=""
                type="secondary"
                onClick={() => {
                  checkReturnTo('Canceled');
                  onCancel();
                }}
              >
                {t('Cancel')}
              </ActionButton>
            </div>
          </form>
        </>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default ConfirmConnectionDialog;
