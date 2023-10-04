import { useMemo } from 'react';
import { debounce } from 'lodash-es';

interface InputProps
  extends React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  debouncedOnChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const Input = ({ debouncedOnChange, onChange, ...props }: InputProps) => {
  const internalOnChange = useMemo(
    () =>
      debouncedOnChange &&
      debounce(
        debouncedOnChange as React.ChangeEventHandler<HTMLInputElement>,
        1000
      ),
    [debouncedOnChange]
  );

  return (
    <input
      {...props}
      onChange={debouncedOnChange ? internalOnChange : onChange}
      type={props.type ?? 'input'}
      className={`w-full rounded border border-gray-300 bg-white py-1 px-3 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${props.className}`}
    />
  );
};

export default Input;
