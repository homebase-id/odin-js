import { TElement } from '@udecode/plate';
import { ImageElementBlock } from './ImagePlugin';
import { createTPlatePlugin, PlateEditor } from '@udecode/plate-core/react';

export interface TImageElement extends TElement {
  fileKey: string;
  lastModified?: number;
}

export const ELEMENT_IMAGE = 'local_image';

export const insertImage = (editor: PlateEditor, fileKey: string) => {
  const text = { text: '' };
  const image: TImageElement = {
    type: ELEMENT_IMAGE,
    fileKey,
    lastModified: new Date().getTime(),
    children: [text],
  };
  const paragraph = {
    type: 'paragraph',
    children: [text],
  };

  editor.tf.insertNodes<TImageElement | TElement>([image, paragraph]);
};

export const ImagePlugin = createTPlatePlugin({
  key: ELEMENT_IMAGE,
  node: {
    isElement: true,
  },
}).extend(() => ({
  render: {
    node: ImageElementBlock,
  },
}));
