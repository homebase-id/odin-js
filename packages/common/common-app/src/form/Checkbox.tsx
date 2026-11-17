export const Checkbox = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  return (
    <input
      {...props}
      type="checkbox"
      className={`h-4 w-4 rounded border-check-outline bg-check text-check-accent focus:ring-2 focus:ring-check-ring ring-offset-check-ring-offset ${props.className}`}
    />
  );
};
