import {
  createPluginFactory,
  getPluginOptions,
  insertNodes,
  PlateEditor,
  TElement,
  Value,
} from '@udecode/plate-common';
import { getImagesFromPasteEvent } from '../../../../common-app/src';
import { ELEMENT_IMAGE, ImageElementBlock, MediaOptions, TImageElement } from './ImagePlugin';

export const insertImage = <V extends Value>(editor: PlateEditor<V>, fileKey: string) => {
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

export const createImagePlugin = createPluginFactory({
  key: ELEMENT_IMAGE,
  isElement: true,
  component: (props) => ImageElementBlock({ ...props }),
  handlers: {
    onPaste: (editor) => (e) => {
      const imageFiles = getImagesFromPasteEvent(e as React.ClipboardEvent<HTMLElement>);

      if (!imageFiles || imageFiles.length === 0) return false;

      e.stopPropagation();
      e.preventDefault();

      (async () => {
        const options = getPluginOptions<MediaOptions | undefined>(editor, ELEMENT_IMAGE);
        if (imageFiles.length > 0 && options?.onAppend) {
          const uploadResult = await options.onAppend(imageFiles[0]);
          if (uploadResult) insertImage(editor, uploadResult.fileKey);
        }
      })();

      return true;
    },
  },
});
