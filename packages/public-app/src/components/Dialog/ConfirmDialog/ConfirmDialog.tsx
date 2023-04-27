import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../../helpers/i18n/dictionary';
import usePortal from '../../../hooks/portal/usePortal';
import Exclamation from '../../ui/Icons/Exclamation/Exclamation';

const ConfirmDialog = ({
  title,
  confirmText,
  children,
  needConfirmation,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmText: string;
  children: ReactNode;
  needConfirmation: boolean;
  onConfirm: (e: React.MouseEvent<HTMLElement>) => void;
  onCancel: (e: React.MouseEvent<HTMLElement>) => void;
}) => {
  const target = usePortal('modal-container');

  if (!needConfirmation) {
    return null;
  }

  const dialog = (
    <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <div className="fixed inset-0 z-10 overflow-y-auto" onClick={onCancel}>
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all dark:bg-black sm:my-8 sm:w-full sm:max-w-lg"
            onClick={(e) => {
              e.preventDefault();
              return false;
            }}
          >
            <div className="bg-white px-4 pt-5 pb-4 text-gray-900 dark:bg-black dark:text-slate-50 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-red-400 sm:mx-0 sm:h-10 sm:w-10">
                  <Exclamation />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-medium leading-6" id="modal-title">
                    {title}
                  </h3>
                  <div className="mt-2">{children}</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 dark:bg-slate-900  sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onConfirm}
              >
                {confirmText}
              </button>
              <button
                type="button"
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-800 dark:bg-slate-700 dark:text-white sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={onCancel}
              >
                {t('Cancel')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, target);
};

export default ConfirmDialog;
