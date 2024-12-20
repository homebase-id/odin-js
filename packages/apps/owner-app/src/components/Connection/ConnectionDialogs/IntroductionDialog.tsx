import {
  ActionButton,
  DialogWrapper,
  ErrorNotification,
  Label,
  t,
  Textarea,
  useIntroductions,
  usePortal,
} from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MemberLookupSelection } from '../../Circles/MemberLookupDialog/MemberLookupDialog';

export const IntroductionDialog = ({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const target = usePortal('modal-container');
  const [message, setMessage] = useState<string>('');
  const [identities, setIdentities] = useState<string[]>([]);

  const {
    mutate: introduceIdentities,
    error: sendIntroductionError,
    status: introduceIdentitiesStatus,
    reset: resetIntroduceIdentities,
  } = useIntroductions().introduceIdentities;

  const doCancel = () => {
    resetIntroduceIdentities();
    onCancel();
  };

  if (!isOpen) return null;

  const dialog = (
    <DialogWrapper
      title={t('Introduce your connections to each other')}
      onClose={() => {
        doCancel();
      }}
      size="4xlarge"
    >
      <>
        <ErrorNotification error={sendIntroductionError} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (introduceIdentitiesStatus === 'pending') return;

            introduceIdentities(
              {
                message: message,
                recipients: identities,
              },
              {
                onSuccess: () => {
                  setIdentities([]);
                  setMessage('');
                  onConfirm();
                },
              }
            );
          }}
        >
          <div className="mb-4 pb-4">
            <Label>{t('Add an optional message to your introduction')}</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Grow your network"
            />
          </div>
          <div className="mb-4 pb-4">
            <h2 className="mb-2 text-lg leading-tight">
              {t('Select two or more connections to introduce to each other')}
            </h2>
            <MemberLookupSelection
              title=""
              defaultSelection={identities}
              setSelection={setIdentities}
            />
          </div>

          <div className="flex flex-row-reverse">
            {identities.length <= 1 ? (
              <p>{t('Select two or more connections to introduce them')}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 py-3 sm:flex-row-reverse">
            <ActionButton
              state={introduceIdentitiesStatus}
              icon={Arrow}
              disabled={identities.length <= 1}
            >
              {t('Introduce')}
            </ActionButton>

            <ActionButton
              className="sm:mr-auto"
              type="secondary"
              onClick={() => {
                doCancel();
              }}
            >
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
