export const Textarea = (
  props: React.DetailedHTMLProps<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >
) => {
  return (
    <textarea
      {...props}
      className={`w-full rounded border border-outline bg-field px-3 py-1 text-base leading-8 text-field-contrast outline-none transition-colors duration-200 ease-in-out focus:border-accent focus:ring-2 focus:ring-focus-ring-soft [&:user-invalid]:border-destructive ${props.className}`}
    />
  );
};
