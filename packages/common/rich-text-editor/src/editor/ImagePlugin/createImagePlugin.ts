import { insertNodes, TElement } from '@udecode/plate-common';
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

  insertNodes<TImageElement | TElement>(editor, [image, paragraph]);
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
  //TODO: Add onPaste handler with support for the mediaOptions
  // handlers: {
  //   onPaste: ({ event: e }) => {
  //     const imageFiles = getImagesFromPasteEvent(e as React.ClipboardEvent<HTMLElement>);

  //     if (!imageFiles || imageFiles.length === 0) return false;

  //     e.stopPropagation();
  //     e.preventDefault();

  //     (async () => {
  //       const options = editor.getOptions<MediaOptions>({ key: ELEMENT_IMAGE });
  //       if (imageFiles.length > 0 && options?.onAppend) {
  //         const uploadResult = await options.onAppend(imageFiles[0]);
  //         if (uploadResult) insertImage(editor, uploadResult.fileKey);
  //       }
  //     })();

  //     return true;
  //   },
  // },
}));
