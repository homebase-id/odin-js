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
          ? 'border border-outline focus:border-primary'
          : ''
      } bg-background px-3 py-1 text-base leading-8 text-foreground outline-none transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-primary ${
        props.className
      }`}
    >
      {props.children}
    </select>
  );
};
