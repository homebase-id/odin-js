export const Checkbox = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  return (
    <input
      {...props}
      type="checkbox"
      className={`h-4 w-4 rounded border-outline bg-surface-container-lowest text-primary focus:ring-2 focus:ring-primary ring-offset-background ${props.className}`}
    />
  );
};
