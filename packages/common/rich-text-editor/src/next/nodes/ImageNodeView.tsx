/**
 * From journal's ImageNode: an image with a caption, float alignment and drag-resized width.
 * A feed image is a payload of the article (`fileKey`): one added while editing shows from its
 * local file, any other through the same Image component the viewer uses. Journal's crop/rotate
 * editor, lightbox and gallery moves are not ported yet.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, Captions, Trash2 } from 'lucide-react';
import { Image } from '@homebase-id/common-app';
import { useArticleEditorMedia } from '../ArticleEditorContext';

type Align = 'left' | 'center' | 'right';

const MIN_WIDTH = 64;
const SAFE_SRC = /^(https?:|blob:|data:image\/(png|jpe?g|gif|webp|avif);)/i;

const ALIGN_STYLE: Record<Align, React.CSSProperties> = {
  left: { float: 'left', margin: '0 1rem 0.5rem 0' },
  right: { float: 'right', margin: '0 0 0.5rem 1rem' },
  center: { display: 'block', margin: '0 auto' },
};

const ALIGN_BUTTONS = [
  { align: 'left', icon: AlignLeft, label: 'Float left' },
  { align: 'center', icon: AlignCenter, label: 'Center' },
  { align: 'right', icon: AlignRight, label: 'Float right' },
] as const;

const CORNERS = [
  { name: 'top left', pos: 'top-0 left-0', side: 'left', cursor: 'cursor-nwse-resize' },
  { name: 'top right', pos: 'top-0 right-0', side: 'right', cursor: 'cursor-nesw-resize' },
  { name: 'bottom left', pos: 'bottom-0 left-0', side: 'left', cursor: 'cursor-nesw-resize' },
  { name: 'bottom right', pos: 'bottom-0 right-0', side: 'right', cursor: 'cursor-nwse-resize' },
] as const;

/** A local object URL for a pending file, revoked when it changes or the view goes. */
const useObjectUrl = (blob?: Blob) => {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url]
  );
  return url;
};

export const ImageNodeView = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) => {
  const media = useArticleEditorMedia();
  const editable = editor.isEditable;
  const { fileKey, fileId, src } = node.attrs as {
    fileKey?: string;
    fileId?: string;
    src?: string;
  };
  const width = node.attrs.width as number | null;
  const align = node.attrs.align as Align | null;
  const alt = (node.attrs.alt as string | null) ?? '';
  // null shows the alt text, "" no caption, anything else replaces the alt text
  const captionAttr = (node.attrs.caption as string | null | undefined) ?? null;
  const caption = captionAttr ?? alt;
  const [panel, setPanel] = useState<'alt' | 'caption' | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const pos = getPos();
  const inGallery =
    pos !== undefined &&
    pos <= editor.state.doc.content.size &&
    editor.state.doc.resolve(pos).parent.type.name === 'gallery';

  const pending = fileKey ? media?.pendingFiles.find((f) => f.key === fileKey)?.file : undefined;
  const pendingUrl = useObjectUrl(pending);

  // A server image measures its box to pick a size, so its box can't shrink-wrap it
  const fromServer = !!fileKey && !pendingUrl;
  const boxWidth = width || (fromServer ? '100%' : 'fit-content');
  const imgClass = width || inGallery ? 'block h-auto w-full' : 'block max-w-full';

  const img = pendingUrl ? (
    <img src={pendingUrl} alt={alt} className={imgClass} />
  ) : fileKey && media ? (
    <Image
      targetDrive={media.mediaDrive}
      fileId={fileId || media.fileId}
      globalTransitId={fileId ? undefined : media.globalTransitId}
      lastModified={media.lastModified}
      fileKey={fileKey}
      odinId={media.odinId}
      alt={alt}
      className={imgClass}
    />
  ) : src && SAFE_SRC.test(src) ? (
    <img src={src} alt={alt} className={imgClass} />
  ) : (
    <div className="flex h-32 w-64 max-w-full items-center justify-center rounded bg-foreground/5 text-xs text-foreground/50">
      Image unavailable
    </div>
  );

  const maxWidth = () => boxRef.current?.parentElement?.offsetWidth ?? Infinity;
  const clamp = (w: number) => Math.round(Math.min(Math.max(w, MIN_WIDTH), maxWidth()));

  const startDrag = (side: 'left' | 'right') => (e: PointerEvent) => {
    e.preventDefault();
    const box = boxRef.current;
    if (!box) return;
    const startX = e.clientX;
    const startWidth = box.offsetWidth;
    // The live width goes straight to the DOM; one commit on release is one undo step
    const onMove = (ev: globalThis.PointerEvent) => {
      const delta = side === 'right' ? ev.clientX - startX : startX - ev.clientX;
      box.style.width = `${clamp(startWidth + delta)}px`;
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      updateAttributes({ width: box.offsetWidth });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, { once: true });
  };

  const onHandleKeyDown = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir || !boxRef.current) return;
    e.preventDefault();
    updateAttributes({ width: clamp(boxRef.current.offsetWidth + dir * (e.shiftKey ? 64 : 16)) });
  };

  const saveText = (name: 'alt' | 'caption', value: string) => {
    const next = value.trim();
    if (name === 'alt') updateAttributes({ alt: next || null });
    else if (next !== (captionAttr ?? '')) updateAttributes({ caption: next || null });
  };

  const button = (active?: boolean) =>
    `rounded p-1 hover:bg-foreground/10 ${active ? 'bg-foreground/10 text-primary' : ''}`;

  const toolbar = editable ? (
    <div
      contentEditable={false}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) e.preventDefault();
      }}
      className={`absolute -top-10 left-1/2 z-10 -translate-x-1/2 flex-col items-center gap-1 ${
        selected ? 'flex' : 'hidden group-hover:flex'
      }`}
    >
      <div className="flex gap-0.5 rounded-md border border-gray-200 bg-background p-0.5 text-foreground shadow-md dark:border-gray-700">
        {!inGallery &&
          ALIGN_BUTTONS.map(({ align: value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={align === value}
              onClick={() => updateAttributes({ align: align === value ? null : value })}
              className={button(align === value)}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        <button
          type="button"
          aria-label="Alt text"
          title="Alt text"
          aria-pressed={!!alt}
          onClick={() => setPanel(panel === 'alt' ? null : 'alt')}
          className={`${button(!!alt)} text-xs font-semibold`}
        >
          ALT
        </button>
        <button
          type="button"
          aria-label="Caption"
          title="Caption"
          aria-pressed={!!caption}
          onClick={() => setPanel(panel === 'caption' ? null : 'caption')}
          className={button(!!caption)}
        >
          <Captions className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Remove image"
          title="Remove image"
          onClick={deleteNode}
          className={button()}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {panel ? (
        <div className="w-56 rounded-md border border-gray-200 bg-background p-2 shadow-md dark:border-gray-700">
          <input
            key={panel}
            autoFocus
            defaultValue={panel === 'alt' ? alt : (captionAttr ?? '')}
            placeholder={panel === 'alt' ? 'Describe this image' : alt || 'Add a caption'}
            aria-label={panel === 'alt' ? 'Alt text' : 'Caption text'}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                if (e.key === 'Enter') saveText(panel, e.currentTarget.value);
                setPanel(null);
              }
            }}
            onBlur={(e) => saveText(panel, e.currentTarget.value)}
            className="w-full rounded border border-gray-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-primary dark:border-gray-600"
          />
          {panel === 'caption' ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ caption: captionAttr === '' ? null : '' })}
              className="mt-1 w-full rounded px-2 py-1 text-left text-xs hover:bg-foreground/10"
            >
              {captionAttr === '' ? 'Show caption' : 'Hide caption'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <NodeViewWrapper as="span" className="image-node" data-drag-handle>
      <span
        ref={boxRef}
        // width last: centring sets `display: block`, which would stretch the box to the column
        style={
          inGallery ? { width: '100%' } : { ...(align ? ALIGN_STYLE[align] : {}), width: boxWidth }
        }
        className={`group relative inline-block max-w-full align-bottom ${
          selected ? 'rounded-sm outline outline-2 outline-primary/60' : ''
        }`}
      >
        <span className="relative block">
          {img}
          {editable && !inGallery
            ? CORNERS.map(({ name, pos, side, cursor }) => (
                <button
                  key={name}
                  type="button"
                  draggable={false}
                  contentEditable={false}
                  aria-label={`Resize image (${name})`}
                  onPointerDown={startDrag(side)}
                  onKeyDown={onHandleKeyDown}
                  style={{ touchAction: 'none' }}
                  className={`absolute flex h-5 w-5 items-center justify-center opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 ${
                    selected ? 'opacity-100' : ''
                  } ${pos} ${cursor}`}
                >
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-primary ring-1 ring-white" />
                </button>
              ))
            : null}
        </span>
        {caption ? (
          // w-0 min-w-full: wraps at the image's width instead of widening the box
          <span
            contentEditable={false}
            className="mt-1 block w-0 min-w-full text-center text-sm text-foreground/60"
          >
            {caption}
          </span>
        ) : null}
        {toolbar}
      </span>
    </NodeViewWrapper>
  );
};
