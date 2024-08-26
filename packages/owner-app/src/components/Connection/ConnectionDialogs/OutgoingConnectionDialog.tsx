import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useFocusedEditing } from '../../../hooks/focusedEditing/useFocusedEditing';
import {
  Alert,
  Textarea,
  t,
  useCheckIdentity,
  usePortal,
  ErrorNotification,
  ActionButton,
  CircleSelector,
  useFollowingInfinite,
  Input,
  Label,
  DialogWrapper,
  CheckboxToggle,
} from '@homebase-id/common-app';
import YourInfo from '../../Connection/YourInfo/YourInfo';
import YourSignature from '../../Connection/YourSignature/YourSignature';
import { getDomainFromUrl } from '@homebase-id/js-lib/helpers';
import { useConnectionActions } from '../../../hooks/connections/useConnectionActions';
import { Arrow } from '@homebase-id/common-app/icons';

const DEFAULT_MESSAGE = t('Hi, I would like to connect with you');

const OutgoingConnectionDialog = ({
  title,
  targetOdinId,
  isOpen,
  onConfirm,
  onCancel,
}: {
  title: string;
  targetOdinId?: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');

  const {
    mutateAsync: sendConnectionRequest,
    status: sendConnectionRequestStatus,
    reset: resetConnectionRequest,
    error: actionError,
  } = useConnectionActions().sendConnectionRequest;
  const { mutateAsync: follow, error: followError } = useFollowingInfinite().follow;
  const checkReturnTo = useFocusedEditing();

  const [doubleChecked, setDoubleChecked] = useState(false);

  const [connectionTarget, setConnectionTarget] = useState<string | undefined>(
    targetOdinId?.toLowerCase() || undefined
  );
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [circleGrants, setCircleGrants] = useState<string[]>([]);
  const [shouldFollow, setShouldFollow] = useState(true);

  const { data: isValidIdentity } = useCheckIdentity(connectionTarget);
  const [invalid, setInvalid] = useState(false);

  const { data: connectionInfo } = useConnection({
    odinId: isValidIdentity ? connectionTarget : undefined,
  }).fetch;

  useEffect(() => setInvalid(false), [connectionTarget]);

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={title}
      onClose={() => {
        setDoubleChecked(false);
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge"
    >
      <>
        <ErrorNotification error={actionError || followError} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (sendConnectionRequestStatus === 'pending') return;
            if (doubleChecked) {
              await sendConnectionRequest(
                {
                  message: message,
                  targetOdinId: connectionTarget as string, // Will be defined as otherwise it would have failed validation before

                  circleIds: circleGrants,
                },
                {
                  onSuccess: () => {
                    checkReturnTo();

                    resetConnectionRequest();
                    setConnectionTarget('');
                    setMessage(DEFAULT_MESSAGE);
                    setCircleGrants([]);
                    setDoubleChecked(false);

                    onConfirm();
                  },
                }
              );
              if (shouldFollow) {
                await follow({
                  odinId: connectionTarget as string,
                  notificationType: 'allNotifications',
                });
              }
            } else {
              if (e.currentTarget.checkValidity() && isValidIdentity) {
                setDoubleChecked(true);
              } else if (!isValidIdentity) {
                setInvalid(true);
              }
            }
          }}
        >
          {!doubleChecked ? (
            <>
              {connectionInfo?.status === 'connected' ? (
                <Alert type={'warning'} className="mb-5">
                  {t(
                    'You are already connected, if this request is accepted, it will reset your connection keys'
                  )}
                </Alert>
              ) : null}
              <div className="mb-5">
                <Label htmlFor="dotyouid">{t('Recipient identity')}</Label>
                <Input
                  id="dotyouid"
                  name="dotyouid"
                  autoCorrect="off"
                  autoCapitalize="none"
                  onChange={(e) => setConnectionTarget(getDomainFromUrl(e.target.value))}
                  onKeyUp={(e) =>
                    (e.currentTarget.value = e.currentTarget.value
                      .toLowerCase()
                      .trimStart()
                      .replace(/\s/g, '.'))
                  }
                  defaultValue={connectionTarget}
                  readOnly={!!targetOdinId && !invalid}
                  disabled={!!targetOdinId && !invalid}
                  required
                  className={invalid ? 'border-red-500 dark:border-red-500' : ''}
                />
                {invalid ? (
                  <p className="mt-1 text-red-500">
                    {t(`We can't seem to find that identity, please confirm it is correct`)}
                    <small className="block text-sm text-foreground">
                      (
                      {t(
                        'If this is a new identity, it can take a while for it to exists across the internet'
                      )}
                      )
                    </small>
                  </p>
                ) : null}
              </div>
              <div className="mb-5">
                <Label htmlFor="message">{t('Message')}</Label>
                <Textarea
                  id="message"
                  name="message"
                  defaultValue={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                  }}
                  required
                />
              </div>
              <Label>{t('From')}</Label>
              <YourSignature />

              <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                <ActionButton icon={Arrow}>{t('Continue')}</ActionButton>
                <ActionButton type="secondary" onClick={onCancel}>
                  {t('Cancel')}
                </ActionButton>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 pb-4">
                <h2 className="mb-2 text-lg leading-tight">
                  {t('Add as a member to one or more circles')}
                  <small className="block text-slate-400 dark:text-slate-600">
                    {connectionTarget} {t('will be added as member to the selected circles')}
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
                  {connectionTarget} {t('will get access to these contact details')}
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
                    {t('View posts from')} &quot;{connectionTarget}&quot; {t('in your feed')}
                  </small>
                </h2>
                <CheckboxToggle
                  className="pointer-events-none ml-2"
                  checked={shouldFollow}
                  readOnly={true}
                />
              </div>

              <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
                <ActionButton state={sendConnectionRequestStatus} icon={Arrow}>
                  {t('Send')}
                </ActionButton>
                <ActionButton
                  onClick={(e) => {
                    e.preventDefault();
                    setDoubleChecked(false);
                  }}
                  type={'secondary'}
                >
                  {t('Back')}
                </ActionButton>
                <ActionButton
                  className="sm:mr-auto"
                  type="secondary"
                  onClick={() => {
                    setDoubleChecked(false);
                    onCancel();
                  }}
                >
                  {t('Cancel')}
                </ActionButton>
              </div>
            </>
          )}
        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};

export default OutgoingConnectionDialog;
