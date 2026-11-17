export const CheckboxToggle = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  const { className, ...inputProps } = props;

  return (
    <label
      className={`${className?.includes('absolute') ? '' : 'relative'}  inline-flex cursor-pointer items-center ${className ?? ''}`}
    >
      <input type="checkbox" className="peer sr-only" {...inputProps} />
      <div
        className={`peer h-6 w-11 rounded-full border border-outline bg-surface-container-highest after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-muted-foreground after:transition-all after:content-[''] peer-checked:border-primary peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:bg-primary-contrast peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary`}
      ></div>
    </label>
  );
};
