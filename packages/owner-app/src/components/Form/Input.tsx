const Input = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  return (
    <input
      {...props}
      type={props.type ?? 'input'}
      className={`w-full rounded border border-gray-300 bg-white py-1 px-3 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 ${props.className}`}
    />
  );
};

export default Input;
