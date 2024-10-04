import { withRef, withVariants } from '@udecode/cn';
import { cva } from 'class-variance-authority';

import { PlateElement } from './plate-element';
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

const blockVariants = cva('', {
  variants: {
    isFirstBlock: {
      false: '',
      true: 'mt-0',
    },
  },
});

const HeadingElementVariants = withVariants(
  withVariants(PlateElement, headingVariants, ['variant']),
  blockVariants,
  ['isFirstBlock']
);

export const HeadingElement = withRef<typeof HeadingElementVariants>(
  ({ children, isFirstBlock, variant = 'h1', ...props }, ref) => {
    const { editor, element } = props;

    return (
      <HeadingElementVariants
        ref={ref}
        as={variant!}
        variant={variant}
        isFirstBlock={element === editor.children[0]}
        {...props}
      >
        {children}
      </HeadingElementVariants>
    );
  }
);
