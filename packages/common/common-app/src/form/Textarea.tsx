export const Textarea = (
  props: React.DetailedHTMLProps<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >
) => {
  return (
    <textarea
      {...props}
      className={`w-full rounded border border-outline bg-background px-3 py-1 text-base leading-8 text-foreground outline-none transition-colors duration-200 ease-in-out focus:border-primary focus:ring-2 focus:ring-primary [&:user-invalid]:border-destructive ${props.className}`}
    />
  );
};
