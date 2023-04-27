import { ReactNode, useRef } from 'react';
import useOutsideTrigger from '../../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import Times from '../Icons/Times/Times';

const DialogWrapper = ({
  children,
  title,
  onClose,
  keepOpenOnBlur,
  size = 'large',
  isSidePanel = true,
}: {
  children: ReactNode;
  title?: string | ReactNode;
  onClose?: () => void;
  keepOpenOnBlur?: boolean;
  size?: 'large' | 'normal' | '4xlarge' | '2xlarge';
  isSidePanel?: boolean;
}) => {
  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => !keepOpenOnBlur && onClose && onClose());

  return (
    <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div
          className={`flex min-h-full ${
            isSidePanel ? 'justify-end' : 'items-end justify-center p-4 sm:items-center sm:p-0'
          }  text-center `}
        >
          <div
            ref={wrapperRef}
            className={`relative transform ${
              !isSidePanel ? 'overflow-hidden rounded-lg shadow-xl sm:w-full' : 'w-full'
            } bg-white text-left  transition-all dark:bg-black  ${
              size === 'normal'
                ? 'sm:max-w-lg'
                : size === 'large'
                ? 'sm:max-w-xl'
                : size === '2xlarge'
                ? 'sm:max-w-2xl'
                : 'sm:max-w-4xl'
            }`}
          >
            <div
              className={`bg-white dark:bg-black dark:text-slate-50 ${
                isSidePanel ? 'flex h-[100vh] flex-col' : ''
              }`}
            >
              {title || onClose ? (
                <div className="flex flex-row bg-slate-100 px-4 py-4 dark:bg-slate-700 sm:px-8">
                  {title ? (
                    <h3
                      className="my-3 text-2xl font-medium leading-6 text-gray-900 dark:text-slate-50"
                      id="modal-title"
                    >
                      {title}
                    </h3>
                  ) : null}
                  {onClose ? (
                    <button onClick={onClose} className="ml-auto p-2">
                      <Times className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div
                className={`${
                  isSidePanel
                    ? 'h-full flex-grow'
                    : 'max-h-[calc(100vh-112px)] sm:max-h-[calc(100vh-10rem)]'
                } overflow-y-auto px-4 py-8  sm:px-8`}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DialogWrapper;
