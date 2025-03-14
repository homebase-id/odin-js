import React from 'react';
import { type PlaceholderProps, usePlaceholderState } from '@udecode/plate/react';

import { cn } from '../../lib/utils';
export const Placeholder = (props: PlaceholderProps) => {
  const { children, nodeProps, placeholder } = props;

  const { enabled } = usePlaceholderState(props);

  return React.Children.map(children, (child) => {
    return React.cloneElement(child, {
      className: child.props.className,
      nodeProps: {
        ...nodeProps,
        className: cn(
          enabled &&
            'before:absolute before:cursor-text before:opacity-30 before:content-[attr(placeholder)]'
        ),
        placeholder,
      },
    });
  });
};

// export const withPlaceholder = createNodeHOC(Placeholder);
// const withPlaceholdersPrimitive = createNodesHOC(Placeholder);

// const withPlaceholders = (components: any) =>
//   withPlaceholdersPrimitive(components, [
//     {
//       key: ELEMENT_PARAGRAPH,
//       placeholder: 'Type a paragraph',
//       hideOnBlur: true,
//       query: {
//         maxLevel: 1,
//       },
//     },
//     {
//       key: ELEMENT_H1,
//       placeholder: 'Untitled',
//       hideOnBlur: false,
//     },
//   ]);
