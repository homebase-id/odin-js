import {
  Plate,
  PlateProvider,
  TEditableProps,
  useEventPlateId,
  getPluginType,
  usePlateEditorRef,
  createPlugins,
  createDeserializeHtmlPlugin,
} from '@udecode/plate-core';
import { createBasicElementsPlugin } from '@udecode/plate-basic-elements';
import {
  createBasicMarksPlugin,
  MARK_BOLD,
  MARK_ITALIC,
  MARK_UNDERLINE,
} from '@udecode/plate-basic-marks';
import { ELEMENT_H1, ELEMENT_H2 } from '@udecode/plate-heading';
import { ELEMENT_PARAGRAPH } from '@udecode/plate-paragraph';
import { ELEMENT_CODE_BLOCK } from '@udecode/plate-code-block';
import { ELEMENT_BLOCKQUOTE } from '@udecode/plate-block-quote';

import { createListPlugin, ELEMENT_OL, ELEMENT_UL, ELEMENT_LI } from '@udecode/plate-list';
import { createLinkPlugin, ELEMENT_LINK } from '@udecode/plate-link';
import { createNodeIdPlugin } from '@udecode/plate-node-id';
import { createSelectOnBackspacePlugin } from '@udecode/plate-select';

// Selected UI Components:
import { BlockToolbarButton, MarkToolbarButton } from '@udecode/plate-ui-toolbar';
import { ListToolbarButton } from '@udecode/plate-ui-list';
import { LinkToolbarButton } from '@udecode/plate-ui-link';

import { RichText, TargetDrive } from '@youfoundation/js-lib';
import {
  RichTextQuote,
  Heading,
  Code,
  OrderedList,
  UnorderedList,
  Bold,
  Italic,
  Underline,
  Link,
  LinkButton,
} from '@youfoundation/common-app';
import {
  AnchorElement,
  Blockquote,
  BoldMark,
  CodeBlock,
  HeadingOne,
  HeadingTwo,
  ItalicMark,
  ListItemBlock,
  OrderedListBlock,
  ParagraphElement,
  UnderlineMark,
  UnorderedListBlock,
} from './ElementRenderers';
import { Image } from '@youfoundation/common-app';
import { createImagePlugin, ELEMENT_IMAGE, ImageToolbarButton } from './ImagePlugin/ImagePlugin';

import {
  createLinkPlugin as createLinkButtonPlugin,
  ELEMENT_LINK as ELEMENT_LINK_BLOCK,
  LinkToolbarButton as LinkButtonToolbarButton,
} from './LinkPlugin';
import { linkPlugin } from './LinkPluginOptions';
import { ReactNode } from 'react';

const NewRichTextEditor = ({
  defaultValue,
  placeholder,
  mediaDrive,
  name,
  onChange,
  className,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue: any[];
  placeholder: string;
  mediaDrive: TargetDrive;
  name: string;
  onChange: (e: { target: { name: string; value: RichText } }) => void;
  className?: string;
}) => {
  const editableProps: TEditableProps = {
    placeholder: placeholder,
  };

  const plugins = createPlugins(
    [
      createNodeIdPlugin(),
      createSelectOnBackspacePlugin({
        options: {
          query: {
            allow: [ELEMENT_IMAGE, ELEMENT_LINK_BLOCK],
          },
        },
      }),

      createBasicMarksPlugin(),
      createBasicElementsPlugin(),
      createListPlugin(),
      createLinkPlugin(linkPlugin),

      createImagePlugin(),
      createLinkButtonPlugin(),
      createDeserializeHtmlPlugin(),
    ],
    {
      components: {
        [MARK_BOLD]: BoldMark,
        [MARK_ITALIC]: ItalicMark,
        [MARK_UNDERLINE]: UnderlineMark,
        [ELEMENT_CODE_BLOCK]: CodeBlock,
        [ELEMENT_H1]: HeadingOne,
        [ELEMENT_H2]: HeadingTwo,
        [ELEMENT_BLOCKQUOTE]: Blockquote,
        [ELEMENT_OL]: OrderedListBlock,
        [ELEMENT_UL]: UnorderedListBlock,
        [ELEMENT_LI]: ListItemBlock,
        [ELEMENT_LINK]: AnchorElement,
        [ELEMENT_PARAGRAPH]: ParagraphElement,
      },
    }
  );

  const Toolbar = ({ children }: { children: ReactNode }) => {
    const mdStyle = 'md:mx-0 md:flex md:w-auto md:flex-row md:gap-2 md:px-0 md:pb-2';
    const dirtyScreenW = 'mx-[calc((100vw-100%)/-2)] w-[100vw] px-[calc((100vw-100%)/2)]';
    const xsStyle = 'mb-2 grid grid-flow-col gap-4 overflow-auto pb-4';
    return (
      <section className={`${xsStyle} ${dirtyScreenW} ${mdStyle} border-b dark:border-b-slate-800`}>
        {children}
      </section>
    );
  };

  const BasicElementToolbarButtons = () => {
    const editor = usePlateEditorRef(useEventPlateId());

    return (
      <>
        <div className="flex flex-row md:mr-3">
          <MarkToolbarButton type={getPluginType(editor, MARK_BOLD)} icon={<Bold />} />
          <MarkToolbarButton type={getPluginType(editor, MARK_ITALIC)} icon={<Italic />} />
          <MarkToolbarButton type={getPluginType(editor, MARK_UNDERLINE)} icon={<Underline />} />
        </div>
        <div className="flex flex-row md:mr-3">
          <BlockToolbarButton
            type={getPluginType(editor, ELEMENT_H1)}
            icon={
              <>
                <Heading className="w-[80%]" />
                <span className=""> 1</span>
              </>
            }
          />
          <div className="mx-[0.1rem]"></div>
          <BlockToolbarButton
            type={getPluginType(editor, ELEMENT_H2)}
            icon={
              <>
                <Heading className="w-[80%]" />
                <span className=""> 2</span>
              </>
            }
          />
        </div>
        <div className="flex flex-row md:mr-3">
          <BlockToolbarButton
            type={getPluginType(editor, ELEMENT_BLOCKQUOTE)}
            icon={<RichTextQuote />}
          />
          <BlockToolbarButton type={getPluginType(editor, ELEMENT_CODE_BLOCK)} icon={<Code />} />
        </div>
        <div className="flex flex-row md:mr-3">
          <ListToolbarButton type={getPluginType(editor, ELEMENT_OL)} icon={<OrderedList />} />
          <ListToolbarButton type={getPluginType(editor, ELEMENT_UL)} icon={<UnorderedList />} />
        </div>
        <div className="flex flex-row md:mr-3">
          <LinkToolbarButton icon={<Link />} />
        </div>
        <div className="flex flex-row md:mr-3">
          <ImageToolbarButton targetDrive={mediaDrive} icon={<Image />} key={'image-component'} />
          <LinkButtonToolbarButton icon={<LinkButton />} key={'link-component'} />
        </div>
      </>
    );
  };

  return (
    <>
      {/* Very dirty way of overruling default styling that are applied to the RTE */}
      <style
        dangerouslySetInnerHTML={{
          __html: `[data-slate-editor-id="plate"]:focus-visible {
      outline: none;
    }[data-slate-editor-id="plate"]{
      flex-grow: 1;
    }.slate-ToolbarButton-active{
      color: rgb(0, 102, 204);
    }[class^="styles__FloatingIconWrapper"]{color: inherit;}[class^="PlateFloatingLink___"]{background-color:rgba(51, 65, 85, 1);}`,
        }}
      />
      <section className={`relative flex w-[100%] flex-col ${className ?? ''}`}>
        <PlateProvider
          initialValue={defaultValue}
          plugins={plugins}
          onChange={(newValue) => {
            onChange({ target: { name: name, value: newValue } });
          }}
        >
          <Toolbar>
            <BasicElementToolbarButtons />
          </Toolbar>
          <Plate editableProps={editableProps} />
        </PlateProvider>
      </section>
    </>
  );
};

export default NewRichTextEditor;
