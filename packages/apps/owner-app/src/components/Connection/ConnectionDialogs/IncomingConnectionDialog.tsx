import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusedEditing } from '../../../hooks/focusedEditing/useFocusedEditing';
import {
  Alert,
  t,
  useFollowingInfinite,
  CheckboxToggle,
  usePortal,
  ActionButton,
  DomainHighlighter,
  CircleSelector,
  DialogWrapper,
  useErrors,
  useIsConnected,
  ContactImage,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import YourInfo from '../../Connection/YourInfo/YourInfo';
import { usePendingConnection } from '../../../hooks/connections/usePendingConnection';
import { useContact } from '@homebase-id/common-app';

const IncomingConnectionDialog = ({
  confirmText,
  senderOdinId,

  isOpen,

  onConfirm,
  onCancel,
}: {
  confirmText?: string;
  senderOdinId: string;

  isOpen: boolean;

  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  const { data: isConnected } = useIsConnected(senderOdinId);

  const { data: contactData } = useContact({
    odinId: senderOdinId,
    canSave: false,
  }).fetch;

  const {
    fetch: { data: pendingConnection },
    acceptRequest: { mutateAsync: acceptPending, status: acceptPendingStatus },
  } = usePendingConnection({ odinId: senderOdinId });

  const { data: introducerContactData } = useContact({
    odinId: pendingConnection?.introducerOdinId,
    canSave: false,
  }).fetch;

  const { mutateAsync: follow } = useFollowingInfinite().follow;

  const checkReturnTo = useFocusedEditing();

  const [doubleChecked, setDoubleChecked] = useState(false);

  const [circleGrants, setCircleGrants] = useState<string[]>([]);
  const [shouldFollow, setShouldFollow] = useState(true);

  const addError = useErrors().add;

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper
      title={
        !pendingConnection?.introducerOdinId ? (
          <>
            {t('Connection request from')} <DomainHighlighter>{senderOdinId}</DomainHighlighter>
          </>
        ) : (
          <>
            {t('You were introduced to')} <DomainHighlighter>{senderOdinId}</DomainHighlighter>
          </>
        )
      }
      onClose={() => {
        setDoubleChecked(false);
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge"
    >
      <>
        {!doubleChecked ? (
          <>
            {isConnected ? (
              <Alert type={'warning'} className="mb-5">
                {t(
                  'You are already connected, confirming this request, will reset your connection keys'
                )}
              </Alert>
            ) : null}
            {!pendingConnection?.introducerOdinId ? (
              <div className="mb-4 pb-4">
                <h2 className="mb-8">
                  {t('The user with the identity')}:{' '}
                  <span className="rounded-lg bg-slate-200 p-1 tracking-wide dark:bg-slate-600">
                    <DomainHighlighter>{senderOdinId}</DomainHighlighter>
                  </span>{' '}
                  {t('would like to connect with you and sent you a personal message')}:
                </h2>

                <div className="-m-4 flex flex-row flex-wrap sm:flex-nowrap">
                  <div className="w-full p-4 md:w-2/5">
                    <ContactImage odinId={senderOdinId} canSave={false} />
                  </div>
                  <div className="w-full p-4 text-gray-600 dark:text-gray-400 md:w-3/5">
                    <p>{pendingConnection?.message}</p>
                    <p className="mt-2">
                      -- {contactData?.fileMetadata?.appData?.content?.name?.displayName}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4 pb-4">
                <h2 className="mb-8">
                  {t('You were introduced to the user with the identity')}:{' '}
                  <span className="rounded-lg bg-slate-200 p-1 tracking-wide dark:bg-slate-600">
                    <DomainHighlighter>{senderOdinId}</DomainHighlighter>
                  </span>{' '}
                  {t('by')}{' '}
                  <span className="rounded-lg bg-slate-200 p-1 tracking-wide dark:bg-slate-600">
                    <DomainHighlighter>{pendingConnection?.introducerOdinId}</DomainHighlighter>
                  </span>{' '}
                  {t('and sent you a message')}:
                </h2>

                <div className="-m-4 flex flex-row flex-wrap sm:flex-nowrap">
                  <div className="w-full p-4 md:w-2/5">
                    <ContactImage odinId={senderOdinId} canSave={false} />
                  </div>
                  <div className="w-full p-4 text-gray-600 dark:text-gray-400 md:w-3/5">
                    <p>{pendingConnection?.message}</p>
                    <p className="mt-2">
                      -- {introducerContactData?.fileMetadata?.appData?.content?.name?.displayName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
              <ActionButton className="" icon={Arrow} onClick={() => setDoubleChecked(true)}>
                {t('Continue')}
              </ActionButton>
              <ActionButton
                className=""
                type="mute"
                onClick={() => {
                  if (!checkReturnTo('Canceled')) onCancel();
                }}
              >
                {t('Cancel')}
              </ActionButton>
              <ActionButton
                className="sm:mr-auto"
                type="secondary"
                onClick={() => {
                  if (!checkReturnTo('Ignored')) onCancel();
                }}
              >
                {t('Ignore request')}
              </ActionButton>
            </div>
          </>
        ) : (
          <>
            <form
              onSubmit={async (e) => {
                if (acceptPendingStatus === 'pending') return;
                e.preventDefault();
                e.stopPropagation();
                try {
                  await acceptPending({
                    senderOdinId: senderOdinId,
                    circleIds: circleGrants,
                  });
                  if (shouldFollow)
                    await follow({
                      request: { odinId: senderOdinId, notificationType: 'allNotifications' },
                      includeHistory: true,
                    });

                  checkReturnTo('Approved');
                  onConfirm();
                } catch (error) {
                  addError(error, t('Failed to accept connection request'));
                }
              }}
            >
              <div className="mb-4 pb-4">
                <h2 className="mb-2 text-lg leading-tight">
                  {t('Add as a member to one or more circles')}:
                  <small className="block text-slate-400 dark:text-slate-600">
                    {senderOdinId} {t('will be added as member to the selected circles')}
                  </small>
                </h2>
                <CircleSelector
                  defaultValue={circleGrants}
                  onChange={(e) => setCircleGrants(e.target.value)}
                  excludeSystemCircles={true}
                />
              </div>

              <h2 className="mb-6 text-lg leading-tight">
                {t('Your contact details')}
                <small className="block text-slate-400 dark:text-slate-600">
                  {senderOdinId} {t('will get access to these contact details')}
                </small>
              </h2>
              <YourInfo circleGrants={circleGrants} className="mb-4" />

              <div
                className="flex cursor-pointer flex-row items-center rounded-lg border bg-white px-4 py-3 dark:border-slate-800 dark:bg-black"
                onClick={() => setShouldFollow(!shouldFollow)}
              >
                <h2 className="mr-auto text-lg leading-tight">
                  {t('Follow')}
                  <small className="block text-slate-400 dark:text-slate-600">
                    {t('View posts from')} &quot;{senderOdinId}&quot; {t('in your feed')}
                  </small>
                </h2>
                <CheckboxToggle
                  className="pointer-events-none ml-2"
                  checked={shouldFollow}
                  readOnly={true}
                />
              </div>

              <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                <ActionButton className="" icon={Arrow} state={acceptPendingStatus}>
                  {confirmText ?? t('Accept')}
                </ActionButton>
                <ActionButton
                  className=""
                  type="secondary"
                  onClick={() => {
                    setDoubleChecked(false);
                    checkReturnTo('Canceled');
                    onCancel();
                  }}
                >
                  {t('Cancel')}
                </ActionButton>
              </div>
            </form>
          </>
        )}
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default IncomingConnectionDialog;
