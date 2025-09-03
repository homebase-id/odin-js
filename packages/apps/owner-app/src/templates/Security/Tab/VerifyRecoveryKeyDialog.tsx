import {useState} from 'react';
import {createPortal} from 'react-dom';
import {ActionButton, DialogWrapper, Label, t, usePortal,} from '@homebase-id/common-app';
import {Check} from "@homebase-id/common-app/icons";
import {verifyRecoveryKey} from "../../../provider/auth/SecurityRecoveryProvider";
import {MaskedInput} from "../../../components/Password/MaskedInput";


export const VerifyRecoveryKeyDialog = ({
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
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>('');
  const [view, setView] = useState<'prompt' | 'valid-phrase'>('prompt');

  const reset = () => {
    setRecoveryPhrase('');
    setState('idle');
    setValidationError(null);
    setView('prompt');
  }

  const doVerify = async () => {

    setState('loading');
    const valid = await verifyRecoveryKey(recoveryPhrase);
    setState("idle");
    if (valid) {
      setView('valid-phrase');
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
        {view == 'valid-phrase' &&
            <div className="mb-2 rounded-lg px-3 py-2">
                <div className="flex items-center ">
                    <Check className="h-5 w-5 mr-2 text-green-600"/>
                    <span className="font-medium">{t('Your phrase has been verified')}</span>
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
                    doVerify();
                  }
                }}
            >
                <div className="mb-2">
                    <Label>{t('Your current password')}</Label>
                    <MaskedInput
                        required
                        name="recoveryPhrase"
                        id="recoveryPhrase"
                        type="password"
                        onChange={(e) => setRecoveryPhrase(e.target.value)}
                        defaultValue={recoveryPhrase}
                        autoComplete="off"
                    />
                </div>
              
              {validationError && <span className="text-red-500">{validationError}</span>}

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
