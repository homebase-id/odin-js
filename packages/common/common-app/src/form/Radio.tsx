export const Radio = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  return (
    <input
      {...props}
      type="radio"
      className={`h-4 w-4 rounded-full border-check-outline bg-check text-check-accent focus:outline-none ring-offset-check-ring-offset ${props.className}`}
    />
  );
};
