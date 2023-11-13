import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Arrow, t, useFollowingInfinite } from '@youfoundation/common-app';
import { useFocusedEditing } from '../../../hooks/focusedEditing/useFocusedEditing';
import { usePortal } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { DomainHighlighter } from '@youfoundation/common-app';
import ContactImage from '../../Connection/ContactImage/ContactImage';
import YourInfo from '../../Connection/YourInfo/YourInfo';
import { CircleSelector } from '@youfoundation/common-app';
import { DialogWrapper } from '@youfoundation/common-app';
import CheckboxToggle from '../../Form/CheckboxToggle';
import { usePendingConnection } from '../../../hooks/connections/usePendingConnection';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useContact } from '../../../hooks/contacts/useContact';

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

  const { data: connectionInfo } = useConnection({ odinId: senderOdinId }).fetch;

  const { data: contactData } = useContact({
    odinId: senderOdinId,
    canSave: false,
  }).fetch;
  const {
    fetch: { data: pendingConnection },
    acceptRequest: { mutateAsync: acceptPending, status: acceptPendingStatus, error: acceptError },
  } = usePendingConnection({ odinId: senderOdinId });

  const { mutateAsync: follow, error: followError } = useFollowingInfinite({}).follow;

  const checkReturnTo = useFocusedEditing();

  const [doubleChecked, setDoubleChecked] = useState(false);

  const [circleGrants, setCircleGrants] = useState<string[]>([]);
  const [shouldFollow, setShouldFollow] = useState(true);

  if (!isOpen) {
    return null;
  }

  const dialog = (
    <DialogWrapper
      title={
        <>
          {t('Connection request from')} <DomainHighlighter>{senderOdinId}</DomainHighlighter>
        </>
      }
      onClose={() => {
        setDoubleChecked(false);
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge"
    >
      <>
        <ErrorNotification error={acceptError || followError} />
        {!doubleChecked ? (
          <>
            {connectionInfo?.status === 'connected' ? (
              <Alert type={'warning'} className="mb-5">
                {t(
                  'You are already connected, confirming this request, will reset your connection keys'
                )}
              </Alert>
            ) : null}
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
                  <ContactImage odinId={senderOdinId} />
                </div>
                <div className="w-full p-4 text-gray-600 dark:text-gray-400 md:w-3/5">
                  <p>{pendingConnection?.message}</p>
                  <p className="mt-2">-- {contactData?.name?.displayName}</p>
                </div>
              </div>
            </div>

            <div className="-m-2 flex flex-col py-3 sm:flex-row-reverse">
              <ActionButton className="m-2" icon={Arrow} onClick={() => setDoubleChecked(true)}>
                {t('Continue')}
              </ActionButton>
              <ActionButton
                className="m-2"
                type="mute"
                onClick={() => {
                  checkReturnTo('Canceled');
                  onCancel();
                }}
              >
                {t('Cancel')}
              </ActionButton>
              <ActionButton
                className="m-2 sm:mr-auto"
                type="secondary"
                onClick={() => {
                  checkReturnTo('Ignored');
                  onCancel();
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
                e.preventDefault();
                await acceptPending({
                  senderOdinId: senderOdinId,
                  circleIds: circleGrants,
                });
                if (shouldFollow)
                  await follow({ odinId: senderOdinId, notificationType: 'allNotifications' });

                checkReturnTo('Approved');
                onConfirm();
              }}
            >
              <div className="mb-4 pb-4">
                <h2 className="mb-2 text-lg leading-tight">
                  {t('Add as member to one or more circles')}:
                  <small className="block text-slate-400 dark:text-slate-600">
                    {senderOdinId} {t('will be added as member to the selected circles')}
                  </small>
                </h2>
                <CircleSelector
                  defaultValue={circleGrants}
                  onChange={(e) => setCircleGrants(e.target.value)}
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

              <div className="-m-2 flex flex-col py-3 sm:flex-row-reverse">
                <ActionButton className="m-2" icon={Arrow} state={acceptPendingStatus}>
                  {confirmText ?? t('Accept')}
                </ActionButton>
                <ActionButton
                  className="m-2"
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
