import { useState } from 'react';
import { createPortal } from 'react-dom';

import { usePortal } from '../../hooks/portal/usePortal';
import { t } from '../../helpers/i18n/dictionary';
import { Input } from '../../form/Input';
import { Label } from '../../form/Label';
import { Checkbox } from '../../form';
import { Exclamation, Question } from '../../ui/Icons';

export interface ConfirmDialogProps {
  type?: 'critical' | 'info' | 'warning';
  title: string;
  buttonText: string;
  body?: string;
  trickQuestion?: TrickQuestion;
  allowSkipNextTime?: boolean;
  onConfirm: (
    e: React.MouseEvent<HTMLElement> | React.FormEvent<HTMLElement>,
    skipNextTime: boolean
  ) => void;
  onCancel: (e: React.MouseEvent<HTMLElement>) => void;
}

export const ConfirmDialog = ({
  type,
  title,
  buttonText,
  body,
  trickQuestion,
  allowSkipNextTime,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const target = usePortal('modal-container');
  const [isValid, setIsvalid] = useState(!trickQuestion);
  const [askNextTime, setAskNextTime] = useState(true);

  const dialog = (
    <div className="relative z-40" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-scrim transition-opacity"></div>

      <div className="fixed inset-0 z-10 overflow-y-auto" onClick={onCancel}>
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div
            className="relative transform overflow-hidden rounded-lg bg-surface text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
          >
            <div className="bg-surface px-4 pb-4 pt-5 text-surface-contrast sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div
                  className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                    type === 'info'
                      ? 'text-dialog-info'
                      : type === 'warning'
                        ? 'text-warning'
                        : 'text-dialog-error'
                  } sm:mx-0 sm:h-10 sm:w-10`}
                >
                  {type !== 'info' ? <Exclamation /> : <Question />}
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6" id="modal-title">
                    {title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm whitespace-pre-wrap">{body}</p>
                  </div>
                  {trickQuestion ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isValid) onConfirm(e, !askNextTime);
                      }}
                    >
                      <TrickQuestion
                        setIsValid={setIsvalid}
                        question={trickQuestion.question}
                        answer={trickQuestion.answer}
                      />
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low py-3 flex flex-col sm:flex-row-reverse px-6 gap-2">
              <button
                type="button"
                className={`${!isValid ? 'pointer-events-none opacity-40' : ''} ${
                  type === 'info' || type === 'warning'
                    ? 'bg-accent-strong text-accent-contrast focus:ring-accent'
                    : 'bg-destructive-strong text-destructive-contrast focus:ring-destructive'
                } flex w-full sm:w-auto justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onConfirm(e, !askNextTime);
                }}
                disabled={!isValid}
              >
                {buttonText}
              </button>
              <button
                type="button"
                className="flex w-full sm:w-auto justify-center rounded-md border border-dialog-cancel-outline bg-dialog-cancel px-4 py-2 text-base font-medium text-dialog-cancel-contrast shadow-sm hover:bg-dialog-cancel-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 sm:text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel(e);
                }}
              >
                {t('Cancel')}
              </button>
              {allowSkipNextTime ? (
                <>
                  <Label
                    className="flex flex-row items-center mr-auto text-sm gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      defaultChecked={!askNextTime}
                      onChange={(e) => setAskNextTime(!e.currentTarget.checked)}
                    />

                    {t(`Don't ask next time`)}
                  </Label>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};

export interface TrickQuestion {
  question: string;
  answer: string;
}

const TrickQuestion = ({
  setIsValid,
  question,
  answer,
}: {
  setIsValid: (val: boolean) => void;
  question: string;
  answer: string;
}) => {
  return (
    <div className="my-5 text-sm">
      <Label>{question}</Label>
      <Input onChange={(e) => setIsValid(e.target.value.toLowerCase() === answer.toLowerCase())} />
    </div>
  );
};
