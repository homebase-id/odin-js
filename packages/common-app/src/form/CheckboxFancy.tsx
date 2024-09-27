export const CheckboxFancy = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  const { className, ...inputProps } = props;

  return (
    <label
      className={`${className?.includes('absolute') ? '' : 'relative'} inline-flex cursor-pointer items-center ${className ?? ''}`}
    >
      <input type="checkbox" className="peer sr-only" {...inputProps} />
      <div
        className={`peer h-6 w-6 rounded-full bg-page-background
            after:content-[''] after:absolute after:inset-0 after:rounded-full
            after:border-[3px] after:border-page-background after:bg-page-background
            peer-checked:after:bg-indigo-600 dark:peer-checked:after:bg-indigo-500
            dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-indigo-800`}
      ></div>
    </label>
  );
};
