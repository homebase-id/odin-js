import React from 'react';
import { ReactNode, Ref } from 'react';

// eslint-disable-next-line react/display-name
const Section = React.forwardRef(
  (
    {
      title,
      actions,
      className,
      children,
      isBorderLess = false,
    }: {
      title?: ReactNode;
      actions?: ReactNode;
      className?: string;
      children: ReactNode;
      isBorderLess?: boolean;
    },
    ref: Ref<HTMLElement>
  ) => {
    return (
      <section
        ref={ref}
        className={`${
          className && className.includes('my-') ? '' : 'my-5'
        } flex flex-col rounded-md shadow-sm ${
          !isBorderLess
            ? 'rounded-lg border border-gray-200 border-opacity-80 dark:border-gray-700'
            : ''
        } bg-white px-5 dark:bg-black dark:text-slate-300 ${className ?? ''}`}
      >
        <SectionTitle title={title} actions={actions} />
        <div className="flex-grow py-5">{children}</div>
      </section>
    );
  }
);

export const SectionTitle = ({ title, actions }: { title?: ReactNode; actions?: ReactNode }) => {
  if (!title && !actions) {
    return null;
  }

  return (
    <div
      className={`relative flex flex-row flex-wrap-reverse items-center border-b-[1px] border-gray-200 border-opacity-80 py-4 transition-all duration-300 dark:border-gray-700`}
    >
      <h3 className="text-xl dark:text-white sm:text-2xl">{title}</h3>
      <div className="ml-auto">
        <div className="grid grid-flow-col gap-2 opacity-60 transition-opacity hover:opacity-100">
          {actions}
        </div>
      </div>
    </div>
  );
};

export default Section;
