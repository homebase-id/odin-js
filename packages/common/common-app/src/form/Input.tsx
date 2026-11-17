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
        className={`w-full rounded border border-outline bg-field px-3 py-1 text-base leading-8 text-field-contrast outline-none transition-colors duration-200 ease-in-out focus:border-accent focus:ring-2 focus:ring-focus-ring [&:user-invalid]:border-destructive ${props.className}`}
      />
    );
  }
);
