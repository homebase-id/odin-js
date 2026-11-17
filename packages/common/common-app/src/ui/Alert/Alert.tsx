import { ReactNode } from 'react';
import { Check, Question, Exclamation } from '../../ui/Icons';
interface AlertProps {
  type: 'success' | 'warning' | 'critical' | 'info';
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  isCompact?: boolean;
}

const ICONS = {
  critical: { Icon: Exclamation, color: 'text-destructive' },
  warning: { Icon: Exclamation, color: 'text-warning-container-contrast' },
  success: { Icon: Check, color: 'text-success' },
  info: { Icon: Question, color: 'text-info' },
} as const;

export const Alert = ({ type, title, children, className, isCompact }: AlertProps) => {
  const icon = ICONS[type];
  const bgClass =
    type === 'critical'
      ? 'bg-error-surface text-error-container-contrast'
      : type === 'warning'
        ? 'bg-warning-container text-warning-container-contrast'
        : 'bg-surface-container-highest text-foreground';

  const borderClass = 'border-outline-variant';

  return (
    <section
      className={`rounded-lg border ${isCompact ? 'p-2' : 'p-5'}
      ${!className?.includes('bg-') ? bgClass : ''}
      ${!className?.includes('boder-') ? borderClass : ''}
       ${className ?? ''}`}
    >
      <div className={`flex w-full flex-row flex-wrap gap-5 sm:flex-nowrap items-center`}>
        <div
          className={`flex h-8 w-8 flex-shrink-0 ${icon.color} ${isCompact ? '' : 'sm:h-10 sm:w-10'}`}
        >
          <icon.Icon />
        </div>
        <div className={`flex-grow ${isCompact ? 'contents' : 'contents sm:block'}`}>
          {title && <p className="mb-2 ml-3 text-xl sm:ml-0">{title}</p>}
          {typeof children === 'string' ? <p>{children}</p> : children}
        </div>
      </div>
    </section>
  );
};

export const SubtleMessage = (
  props: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>
) => {
  return (
    <div className="flex flex-row">
      <p
        {...props}
        className={`mr-auto rounded-lg py-3 italic text-muted-foreground ${props.className || ''}`}
      />
    </div>
  );
};
