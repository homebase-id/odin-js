import { ReactNode } from 'react';

type SelectProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
> & { children: ReactNode };

export const Select = (props: SelectProps) => {
  return (
    <select
      {...props}
      className={`w-full rounded ${
        !props.className || props.className?.indexOf('border') === -1
          ? 'border border-outline focus:border-accent'
          : ''
      } bg-field px-3 py-1 text-base leading-8 text-field-contrast outline-none transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-focus-ring-soft ${
        props.className
      }`}
    >
      {props.children}
    </select>
  );
};
