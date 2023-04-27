import { ReactNode } from 'react';

type SelectProps = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLSelectElement>,
  HTMLSelectElement
> & { children: ReactNode };

const Select = (props: SelectProps) => {
  return (
    <select
      {...props}
      className={`w-full rounded ${
        !props.className || props.className?.indexOf('border') === -1
          ? 'border border-gray-300 focus:border-indigo-500 dark:border-gray-700'
          : ''
      } bg-white py-1 px-3 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-indigo-200 dark:bg-gray-900 dark:text-gray-100 ${
        props.className
      }`}
    >
      {props.children}
    </select>
  );
};

export default Select;
