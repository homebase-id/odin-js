import { forwardRef } from 'react';

// eslint-disable-next-line react/display-name
export const Input = forwardRef(
  (
    props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
    ref: React.Ref<HTMLInputElement>
  ) => {
    return (
      <input
        {...props}
        ref={ref}
        type={props.type ?? 'input'}
        className={`w-full rounded border border-gray-300 bg-white px-3 py-1 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 [&:user-invalid]:border-red-500 ${props.className}`}
      />
    );
  }
);
