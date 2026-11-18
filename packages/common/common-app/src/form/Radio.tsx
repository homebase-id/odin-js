export const Radio = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  return (
    <input
      {...props}
      type="radio"
      className={`h-4 w-4 rounded-full border-outline bg-surface-container-lowest text-primary focus:outline-none ring-offset-background ${props.className}`}
    />
  );
};
