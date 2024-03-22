import { PlateElement, PlateElementProps } from '@udecode/plate-common';
import { cva, VariantProps } from 'class-variance-authority';

const headingVariants = cva('', {
  variants: {
    variant: {
      h1: 'mb-1 font-heading text-xl font-bold',
      h2: 'mb-1 font-heading text-lg',
    },
    isFirstBlock: {
      true: 'mt-0',
      false: '',
    },
  },
});

export function HeadingElement({
  className,
  variant = 'h1',
  children,
  ...props
}: PlateElementProps & VariantProps<typeof headingVariants>) {
  const { element, editor } = props;

  const Element = variant!;

  return (
    <PlateElement
      asChild
      className={headingVariants({
        variant,
        className,
        isFirstBlock: element === editor.children[0],
      })}
      {...props}
    >
      <Element>{children}</Element>
    </PlateElement>
  );
}
