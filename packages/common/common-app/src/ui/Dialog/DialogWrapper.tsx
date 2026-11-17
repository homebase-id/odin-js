import { ReactNode, useEffect, useRef } from 'react';

import { useOutsideTrigger } from '../../hooks/clickedOutsideTrigger/useClickedOutsideTrigger';
import { Times } from '../../ui/Icons';

export const DialogWrapper = ({
  children,
  title,
  footer,
  onClose,
  keepOpenOnBlur,
  size = 'large',
  isSidePanel = true,
  isPaddingLess = false,
  isOverflowLess = false,
  zIndex,
}: {
  children: ReactNode;
  title?: string | ReactNode;
  footer?: string | ReactNode;
  onClose?: () => void;
  keepOpenOnBlur?: boolean;
  size?: 'large' | 'normal' | '4xlarge' | '2xlarge';
  isSidePanel?: boolean;
  isPaddingLess?: boolean;
  isOverflowLess?: boolean;
  zIndex?: number;
}) => {
  const wrapperRef = useRef(null);
  useOutsideTrigger(wrapperRef, () => !keepOpenOnBlur && onClose && onClose());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        e.stopPropagation();

        !keepOpenOnBlur && onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    return () => document.documentElement.classList.remove('overflow-hidden');
  }, []);

  return (
    <div
      className="relative"
      style={{ zIndex: zIndex ?? 40 }}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-scrim transition-opacity"></div>
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div
          className={`min-h-full ${
            isSidePanel
              ? 'flex items-end justify-end sm:items-stretch'
              : 'flex items-end justify-center sm:items-center'
          } p-4 text-center sm:p-0`}
        >
          <div
            ref={wrapperRef}
            className={`relative transform ${isOverflowLess ? '' : 'overflow-hidden'} shadow-xl ${
              isSidePanel ? 'sm:overflow-auto sm:rounded-none sm:shadow-none' : ''
            } w-full text-left transition-all ${
              size === 'normal'
                ? 'sm:max-w-lg'
                : size === 'large'
                  ? 'sm:max-w-xl'
                  : size === '2xlarge'
                    ? 'sm:max-w-2xl'
                    : 'sm:max-w-4xl'
            }`}
          >
            <div className="flex h-full flex-col max-h-screen">
              {title || onClose ? (
                <div
                  className={`flex flex-row bg-surface-container-highest px-4 py-4 sm:px-8 ${
                    isSidePanel ? 'sm:rounded-none' : ''
                  } rounded-t-lg overflow-hidden`}
                >
                  {title ? (
                    <h3
                      className="z-40 w-20 flex-grow my-3 text-2xl font-medium leading-6 text-surface-contrast"
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
                className={`flex-grow bg-surface text-dialog-contrast ${isPaddingLess ? '' : 'px-4 py-8 sm:px-8'}
                ${
                  isOverflowLess ? '' : 'overflow-auto overflow-y-auto'
                } sm:max-h-[calc(100vh-5rem)] `}
              >
                {children}
              </div>
              <div
                className={`bg-surface pb-2 rounded-b-lg ${
                  isSidePanel ? 'sm:rounded-none' : ''
                }`}
              >
                {footer}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
