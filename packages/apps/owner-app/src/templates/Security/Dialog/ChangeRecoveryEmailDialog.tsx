import {useState} from 'react';
import {createPortal} from 'react-dom';
import {ActionButton, DialogWrapper, Input, Label, t, usePortal,} from '@homebase-id/common-app';
import {Check} from "@homebase-id/common-app/icons";
import {
  getRecoveryInfo,
  RecoveryInfo,
  updateRecoveryEmail
} from "../../../provider/auth/SecurityHealthProvider";
import {MaskedInput} from "../../../components/Password/MaskedInput";


export const ChangeRecoveryEmailDialog = ({
                                            title,
                                            info,
                                            isOpen,
                                            verifyOnly,
                                            onConfirm,
                                            onCancel,
                                          }: {
  title: string;
  info: RecoveryInfo,
  isOpen: boolean;
  verifyOnly: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {

  const target = usePortal('modal-container');
  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newRecoveryEmail, setNewRecoveryEmail] = useState<string>('');
  // const [info, setInfo] = useState<RecoveryInfo | null>()
  const [view, setView] = useState<'prompt' | 'done'>('prompt');

  const reset = async () => {
    setCurrentPassword('');
    setState('idle');
    setValidationError(null);
    setView('prompt');

    // const info = await getRecoveryInfo();
    // setInfo(info);
  }

  const doUpdateRecoveryEmail = async () => {
    setState('loading');
    try {
      await updateRecoveryEmail(newRecoveryEmail, currentPassword);
      setView('done');
      setValidationError(null);
    } catch (err: any) {
      setValidationError(err.message);
    } finally {
      setState('idle');
    }
  }

  if (!isOpen) return null;

  if (info == null) {
    return (<DialogWrapper
      title={title}
      onClose={() => {
        reset();
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge">
      <>
        <div className="flex flex-col items-center justify-center h-full">Error</div>
      </>
    </DialogWrapper>)
  }

  const dialog = (
    <DialogWrapper
      title={title}
      onClose={() => {
        reset();
        onCancel();
      }}
      keepOpenOnBlur={true}
      size="2xlarge">
      <>
        {view == 'done' &&
            <div className="mb-2 rounded-lg px-3 py-2">
                <div className="flex items-center ">
                    <Check className="h-5 w-5 mr-2 text-green-600"/>
                    <span
                        className="font-medium">{t('We have sent an email to your recovery email.  Please follow the instructions in this email to finalize your update.')}</span>
                </div>

                <div className="mt-3">
                    <ActionButton
                        onClick={() => {
                          reset();
                          onConfirm();
                        }}>
                      {t('Close')}
                    </ActionButton>
                </div>
            </div>
        }

        {view == 'prompt' &&
            <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (e.currentTarget.reportValidity()) {
                    doUpdateRecoveryEmail();
                  }
                }}
            >
                <div className="mb-2">
                    <Label>{t('Your current recovery email')}</Label>
                    <span>{info?.email}</span>
                </div>
                <hr className="my-4"/>
                <div className="mb-2">
                  {verifyOnly ?
                    <Label>{t('Recovery email')}</Label> :
                    <Label>{t('New Recovery email')}</Label>}
                    <Input
                        required
                        readOnly={verifyOnly}
                        name="recoveryEmail"
                        id="recoveryEmail"
                        type="email"
                        onChange={(e) => setNewRecoveryEmail(e.target.value)}
                        defaultValue={verifyOnly ? info?.email ?? "" : newRecoveryEmail}
                        autoComplete="email"
                    />
                </div>
                <div className="mb-2">
                    <Label>{t('Your current password')}</Label>
                    <MaskedInput
                        required
                        name="pleaesIgnoreMeFirefox"
                        id="pleaesIgnoreMeFirefox"
                        type="password"
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        defaultValue={currentPassword}
                        autoComplete="one-time-code"
                    />
                </div>

              {validationError && <div>
                  <span className="text-red-500">{validationError}</span>
              </div>}

                <div className="mt-5 flex flex-row-reverse">
                    <ActionButton state={state}>
                      {t('Save')}
                    </ActionButton>
                </div>
            </form>}

      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};