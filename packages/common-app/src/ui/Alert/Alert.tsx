import { ReactNode } from 'react';
import { Question, Exclamation } from '../../ui';
interface AlertProps {
  type: 'success' | 'warning' | 'critical' | 'info';
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  isCompact?: boolean;
}

export const Alert = ({ type, title, children, className, isCompact }: AlertProps) => {
  const bgClass =
    type === 'critical'
      ? 'bg-red-50 dark:bg-red-900 dark:text-white'
      : type === 'warning'
      ? 'bg-orange-50'
      : 'bg-slate-100 dark:bg-slate-700';

  const borderClass =
    type === 'critical'
      ? 'border-red-100 dark:border-red-800 dark:text-white'
      : type === 'warning'
      ? 'border-orange-100'
      : 'dark:border-slate-900';

  return (
    <section
      className={`rounded-lg border ${isCompact ? 'p-2' : 'p-5'}
      ${!className?.includes('bg-') ? bgClass : ''}
      ${!className?.includes('boder-') ? borderClass : ''}
       ${className ?? ''}`}
    >
      <div className={`flex w-full flex-row flex-wrap sm:flex-nowrap`}>
        {type === 'critical' ? (
          <div
            className={`mb-2 flex h-8 w-8 flex-shrink-0 text-red-400 dark:text-red-300 ${
              isCompact ? 'mb-2 mr-2' : 'sm:mx-0 sm:my-auto sm:h-10 sm:w-10'
            }`}
          >
            <Exclamation />
          </div>
        ) : type === 'warning' ? (
          <div
            className={`mb-2 flex h-8 w-8 flex-shrink-0 text-orange-400 ${
              isCompact ? 'mb-2 mr-2' : 'sm:mx-0 sm:my-auto sm:h-10 sm:w-10'
            }`}
          >
            <Exclamation />
          </div>
        ) : (
          <div
            className={`mb-2 flex h-8 w-8 flex-shrink-0 text-blue-400 ${
              isCompact ? 'mb-2 mr-2' : 'sm:mx-0 sm:my-auto sm:h-10 sm:w-10'
            }`}
          >
            <Question />
          </div>
        )}
        <div className={`ml-5 flex-grow ${isCompact ? 'contents' : 'contents sm:block'}`}>
          {title && <p className="mb-2 ml-3 text-2xl sm:ml-0">{title}</p>}
          {children}
        </div>
      </div>
    </section>
  );
};

export const SubtleMessage = (
  props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>
) => {
  return (
    <p
      {...props}
      className={`bg-background max-w-2xl rounded-lg px-3 py-3 italic text-gray-400 ${
        props.className || ''
      }`}
    />
  );
};
