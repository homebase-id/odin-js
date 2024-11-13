export const Label = (
  props: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>
) => {
  return (
    <label
      {...props}
      className={`${props.className?.includes('mb-') ? '' : 'mb-2'} block font-medium ${
        props.className
      }`}
    >
      {props.children}
    </label>
  );
};
