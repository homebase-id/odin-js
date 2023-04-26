const Label = (
  props: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>
) => {
  return (
    <label {...props} className={`mb-2 block ${props.className}`}>
      {props.children}
    </label>
  );
};

export default Label;
