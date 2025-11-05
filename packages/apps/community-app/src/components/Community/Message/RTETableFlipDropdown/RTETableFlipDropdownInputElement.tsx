import {lazy, useMemo} from 'react';

import {cn, withRef} from '@udecode/cn';
import {PlateEditor} from '@udecode/plate-core/react';
import {getEditorPlugin, TNode} from '@udecode/plate';

import {getPlainTextFromRichText} from '@homebase-id/common-app';

import {ELEMENT_CHANNEL} from './RTEChannelDropdownPlugin';

const PlateElement = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.PlateElement,
  }))
);

const RTEDropdown = lazy(() =>
  import('@homebase-id/rich-text-editor').then((rootExport) => ({
    default: rootExport.RTEDropdown,
  }))
);
import {type DropdownValue} from '@homebase-id/rich-text-editor';

const onSelectItem = (editor: PlateEditor, item: DropdownValue, node: TNode) => {
  const {getOptions} = getEditorPlugin(editor, {
    key: ELEMENT_CHANNEL,
  });
  const {insertSpaceAfterChannel} = getOptions();

  if (node) {
    const path = editor.api.findPath(node);
    editor.tf.removeNodes({at: path});
  }

  editor.tf.insertText(item.value);
  // editor.tf.insertNodes({
  //   type: '',
  //   children: [{text: item.label ?? ""}],
  // });

  // move the selection after the element
  editor.tf.move({unit: 'offset'});

  const pathAbove = editor.api.block({above: true})?.[1];
  const isBlockEnd =
    editor.selection && pathAbove && editor.api.isEnd(editor.selection.anchor, pathAbove);

  if (isBlockEnd && insertSpaceAfterChannel) {
    editor.tf.insertText(' ');
  }
};

const onCancel = (editor: PlateEditor, value: string, node: TNode) => {
  const path = editor.api.findPath(node);
  if (!path) return;

  editor.tf.replaceNodes({text: value}, {at: path, select: true});
};

export const RTETableFlipDropdownInputElement = withRef<typeof PlateElement>(
  ({className, ...props}, ref) => {
    const {children, editor, element} = props;
    const value = useMemo(() => getPlainTextFromRichText(element.children), [element.children]);

    return (
      <PlateElement as="span" ref={ref} {...props} className={cn('relative', className)}>
        <TableFlipDropdown
          searchVal={value}
          onSelect={(flip) => onSelectItem(editor, flip, element)}
          onCancel={(clear) => onCancel(editor, clear ? '' : `${element.trigger}${value}`, element)}
        />
        {children}
      </PlateElement>
    );
  }
);

const TableFlipDropdown = ({
                             searchVal,
                             onSelect,
                             onCancel,
                           }: {
  searchVal?: string;
  onSelect: (value: DropdownValue) => void;
  onCancel: (clear?: boolean) => void;
}) => {

  const tableFlips: DropdownValue[] = [
    // === Main Pack ===
    {label: "(╯°□°）╯︵ pᴉɥsɹosuǝɔ", value: "(╯°□°）╯︵ pᴉɥsɹosuǝɔ"},
    {label: "(ノಠ益ಠ)ノ彡 pᴉɥsɹosuǝɔ", value: "(ノಠ益ಠ)ノ彡 pᴉɥsɹosuǝɔ"},
    {label: "(╯°益°)╯彡 pᴉɥsɹosuǝɔ", value: "(╯°益°)╯彡 pᴉɥsɹosuǝɔ"},
    {label: "(ﾉಥ益ಥ）ﾉ ┻━┻ pᴉɥsɹosuǝɔ", value: "(ﾉಥ益ಥ）ﾉ ┻━┻ pᴉɥsɹosuǝɔ"},
    {label: "┻━┻ ︵ヽ(`Д´)ﾉ︵ pᴉɥsɹosuǝɔ", value: "┻━┻ ︵ヽ(`Д´)ﾉ︵ pᴉɥsɹosuǝɔ"},
    {label: "┬─┬ ノ( ゜-゜ノ) pᴉɥsɹosuǝɔ", value: "┬─┬ ノ( ゜-゜ノ) pᴉɥsɹosuǝɔ"},

    // === Bonus Pack ===
    {label: "(ノ°Д°）ノ︵ ┻━┻", value: "(ノ°Д°）ノ︵ ┻━┻"},
    {label: "(ﾉಥДಥ)ﾉ︵ ┻━┻︵ pᴉɥsɹosuǝɔ", value: "(ﾉಥДಥ)ﾉ︵ ┻━┻︵ pᴉɥsɹosuǝɔ"},
    {label: "(ノ゜▽゜)ノ︵ ┬─┬", value: "(ノ゜▽゜)ノ︵ ┬─┬"},
    {label: "┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻", value: "┻━┻ ︵ヽ(`Д´)ﾉ︵ ┻━┻"},
    {label: "┬─┬ ノ( ゜-゜ノ) pᴉɥsɹosuǝɔ", value: "┬─┬ ノ( ゜-゜ノ) pᴉɥsɹosuǝɔ"},
    {label: "┬─┬ ︵ /(.□ ./)", value: "┬─┬ ︵ /(.□ ./)"},
    {label: "┻━┻︵┻━┻︵┻━┻", value: "┻━┻︵┻━┻︵┻━┻"},
    {label: "︵ pᴉɥsɹosuǝɔ", value: "︵ pᴉɥsɹosuǝɔ"},

    // === Ultra Pack ===
    {label: "(╯°□°)╯︵ ┻━┻刀", value: "(╯°□°)╯︵ ┻━┻刀"},
    {label: "┻━┻ ︵ヽ(°□°ヽ)", value: "┻━┻ ︵ヽ(°□°ヽ)"},
    {label: "¯\\_(ツ)_/¯︵ ┻━┻", value: "¯\\_(ツ)_/¯︵ ┻━┻"},
    {label: "(=①ω①=)︵ ┻━┻", value: "(=①ω①=)︵ ┻━┻"},
    {label: "(◣_◢)︵ pᴉɥsɹosuǝɔ", value: "(◣_◢)︵ pᴉɥsɹosuǝɔ"},
    {label: "ᕙ(⇀‸↼‶)ᕗ︵ ┻━┻", value: "ᕙ(⇀‸↼‶)ᕗ︵ ┻━┻"},
    {label: "(°□°)⊃━☆ﾟ.*･｡ﾟ︵ ┻━┻", value: "(°□°)⊃━☆ﾟ.*･｡ﾟ︵ ┻━┻"},
    {label: "(◎︵◎)︵ ┻━┻", value: "(◎︵◎)︵ ┻━┻"},
    {label: "┻━┻︵ヽ(`益´ゞ)ﾉ︵┻━┻︵┻━┻", value: "┻━┻︵ヽ(`益´ゞ)ﾉ︵┻━┻︵┻━┻"},
    {label: "┬─┬ 🍵 (•_•)ノ", value: "┬─┬ 🍵 (•_•)ノ"},
  ];


  return (
    <>
      <RTEDropdown
        trigger="~"
        items={tableFlips}
        onSelect={onSelect}
        onCancel={onCancel}
        onCreate={undefined}
        searchVal={searchVal}
      />
    </>
  );
};
