const CheckboxToggle = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  const { className, ...inputProps } = props;

  return (
    <label className={`relative inline-flex cursor-pointer items-center ${className ?? ''}`}>
      <input type="checkbox" className="peer sr-only" {...inputProps} />
      <div
        className={`peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-indigo-800`}
      ></div>
    </label>
  );
};

export default CheckboxToggle;
