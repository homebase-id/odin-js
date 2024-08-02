import { createPortal } from 'react-dom';

import { usePortal } from '../../hooks/portal/usePortal';
import { ActionButton, ActionButtonProps, Exclamation, Question } from '../../ui';
import { t } from '../../helpers/i18n/dictionary';

export interface OptionDialogOptionProps extends Omit<ActionButtonProps, 'onClick'> {
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export interface OptionDialogProps {
  type?: 'critical' | 'info' | 'warning';
  title: string;
  body?: string;

  options: (OptionDialogOptionProps | undefined)[];
  onCancel: (e: React.MouseEvent<HTMLElement>) => void;
}

export const OptionDialog = ({
  type,
  title,
  body,

  options,
  onCancel,
}: OptionDialogProps) => {
  const target = usePortal('modal-container');
  const dialog = (
    <div className="relative z-40" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <div className="fixed inset-0 z-10 overflow-y-auto" onClick={onCancel}>
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all dark:bg-black sm:my-8 sm:w-full sm:max-w-xl"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
          >
            <div className="bg-white px-4 pb-4 pt-5 text-gray-900 dark:bg-black dark:text-slate-50 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div
                  className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${
                    type === 'info'
                      ? 'text-indigo-400'
                      : type === 'warning'
                        ? 'text-orange-400'
                        : 'text-red-400'
                  } sm:mx-0 sm:h-10 sm:w-10`}
                >
                  {type !== 'info' ? <Exclamation /> : <Question />}
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6" id="modal-title">
                    {title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm">{body}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 dark:bg-slate-900 flex flex-col sm:flex-row-reverse sm:px-6 gap-2">
              {(options.filter(Boolean) as OptionDialogOptionProps[]).map((option, index) => (
                <ActionButton
                  key={index}
                  {...option}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    option.onClick(e);
                  }}
                />
              ))}

              <ActionButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancel(e);
                }}
                type="secondary"
                className="mr-auto"
              >
                {t('Cancel')}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};
