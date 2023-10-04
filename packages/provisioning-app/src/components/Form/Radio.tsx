const Radio = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  return (
    <input
      {...props}
      type="radio"
      className="h-4 w-4 rounded-full border-gray-300 bg-gray-100 text-blue-600 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
    />
  );
};

export default Radio;
