import {useState} from 'react';
import {createPortal} from 'react-dom';
import {ActionButton, DialogWrapper, Label, SubtleMessage, t, usePortal,} from '@homebase-id/common-app';
import {Check} from "@homebase-id/common-app/icons";
import {verifyPassword} from "../../../provider/auth/SecurityHealthProvider";
import {MaskedInput} from "../../../components/Password/MaskedInput";


export const VerifyPasswordDialog = ({
                                       title,
                                       isOpen,
                                       onConfirm,
                                       onCancel,
                                     }: {
  title: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {

  const target = usePortal('modal-container');
  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [view, setView] = useState<'prompt' | 'valid-password'>('prompt');

  const reset = () => {
    setCurrentPassword('');
    setState('idle');
    setValidationError(null);
    setView('prompt');
  }

  const doVerifyPassword = async () => {

    setState('loading');
    const valid = await verifyPassword(currentPassword);
    setState("idle");
    if (valid) {
      setView('valid-password');
      setValidationError(null);

    } else {
      setValidationError("Your password was not correct");
    }
  }

  if (!isOpen) return null;

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
        {view == 'valid-password' &&
            <div className="mb-2 rounded-lg px-3 py-2">
                <div className="flex items-center ">
                    <Check className="h-5 w-5 mr-2 text-green-600"/>
                    <span className="font-medium">{t('Your password is verified')}</span>
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
                    doVerifyPassword();
                  }
                }}
            >
                <div className="mb-2">
                    <Label>{t('Your current password')}</Label>

                    {/*<SubtleMessage>*/}
                    {/*    <div>*/}
                    {/*        Forgot your password? {' '}*/}
                    {/*        <Link to={'/owner/security/password-recovery'} className="text-blue-600 underline">*/}
                    {/*            Click here*/}
                    {/*        </Link>*/}
                    {/*        {' '} to request to view it.*/}
                    {/*    </div>*/}
                    {/*</SubtleMessage>*/}
                    
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
                  <SubtleMessage>
                      If you cannot recall your password, try your recovery phrase.
                  </SubtleMessage>
              </div>}

                <div className="mt-5 flex flex-row-reverse">
                    <ActionButton state={state}>
                      {t('Verify')}
                    </ActionButton>
                </div>
            </form>}

      </>
    </DialogWrapper>
  );

  return createPortal(dialog, target);
};
