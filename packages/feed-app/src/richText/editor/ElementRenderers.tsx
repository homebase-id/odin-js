import {
  PlateRenderElementProps,
  PlateRenderLeafProps,
  Value,
  EText,
  EElement,
} from '@udecode/plate-core';

// The custom element props interface should extend PlateRenderElementProps<V> where TElement is the element type.
// The custom leaf props interface should extend PlateRenderLeafProps<V> where TText is the leaf type.

export const ItalicMark = <V extends Value = Value, N extends EText<V> = EText<V>>(
  props: PlateRenderLeafProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <em {...attributes} {...nodeProps}>
      {children}
    </em>
  );
};

export const BoldMark = <V extends Value = Value, N extends EText<V> = EText<V>>(
  props: PlateRenderLeafProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <strong {...attributes} {...nodeProps}>
      {children}
    </strong>
  );
};

export const UnderlineMark = <V extends Value = Value, N extends EText<V> = EText<V>>(
  props: PlateRenderLeafProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <u {...attributes} {...nodeProps}>
      {children}
    </u>
  );
};

export const ParagraphElement = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <p {...attributes} {...nodeProps} className="mb-3">
      {children}
    </p>
  );
};
export const CodeBlock = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <code {...attributes} {...nodeProps}>
      {children}
    </code>
  );
};

export const HeadingOne = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <h1 {...attributes} {...nodeProps} className={'text-2xl'}>
      {children}
    </h1>
  );
};

export const HeadingTwo = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <h2 {...attributes} {...nodeProps} className={'text-xl'}>
      {children}
    </h2>
  );
};

export const Blockquote = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <blockquote {...attributes} {...nodeProps} className="border-l-4 pl-2">
      {children}
    </blockquote>
  );
};

export const OrderedListBlock = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <ol {...attributes} {...nodeProps} className="list-decimal pl-5">
      {children}
    </ol>
  );
};

export const UnorderedListBlock = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <ul {...attributes} {...nodeProps} className="list-disc pl-5">
      {children}
    </ul>
  );
};

export const ListItemBlock = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <li {...attributes} {...nodeProps}>
      {children}
    </li>
  );
};

export const AnchorElement = <V extends Value = Value, N extends EElement<V> = EElement<V>>(
  props: PlateRenderElementProps<V, N>
) => {
  const { attributes, children, nodeProps } = props;

  return (
    <span {...attributes} {...nodeProps} className="text-primary">
      {children}
    </span>
  );
};
