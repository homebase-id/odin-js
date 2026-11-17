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
        className={`peer h-6 w-6 rounded-full bg-fancy-check
            after:content-[''] after:absolute after:inset-0 after:rounded-full
            after:border-2 after:border-page-background after:bg-page-background
            peer-checked:after:bg-check-selected group-hover:after:bg-check-selected-hover`}
      ></div>
    </label>
  );
};
