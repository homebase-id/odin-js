/**
 * The next article editor: journal's Tiptap editor in the feed's article schema
 * (packages/common/rich-text). It opens any article through articleDocOf, so an old Slate body
 * opens converted, and reports each change as the `{ body, bodyDoc }` the article stores.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
// The modules themselves, not the package index, which brings the whole editor schema along
import {
  articleDocOf,
  toStoredArticleBody,
  type StoredArticleBody,
} from '@homebase-id/rich-text/src/stored';
import { ArticleEditorContext, type ArticleEditorMedia } from './ArticleEditorContext';
import { createArticleEditorExtensions } from './editorExtensions';
import { BubbleMenuToolbar } from './BubbleMenuToolbar';
import type { MentionItem } from './suggestionLists';
import { MAX_IMAGE_BYTES, prepareImageForUpload, UnsupportedImageError } from './imageIngest';
import './articleEditor.css';

export type { ArticleEditorMedia };

export type ArticleEditorProps = {
  /** The article as stored; read once, when the editor opens */
  article: { body?: unknown; bodyDoc?: { format: string; doc: unknown; slateHash: string } | null };
  media?: ArticleEditorMedia;
  mentionables?: { value: string; label?: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: StoredArticleBody) => void;
};

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

const ArticleEditorInner = ({
  initialDoc,
  media,
  mentionables,
  placeholder,
  disabled,
  className,
  onChange,
}: Omit<ArticleEditorProps, 'article'> & { initialDoc: JSONContent }) => {
  // The extensions are made once; what they call is read through refs
  const latest = useRef({ media, mentionables, onChange });
  latest.current = { media, mentionables, onChange };
  const [imageError, setImageError] = useState<string>();

  const extensions = useMemo(
    () =>
      createArticleEditorExtensions({
        placeholder,
        mentionables: (): MentionItem[] =>
          (latest.current.mentionables ?? []).map((m) => ({
            id: m.value,
            label: m.label || m.value,
          })),
        insertImages: (editor, files, pos, gallery) =>
          void insertImages(editor, files, pos, gallery),
      }),
    []
  );

  const insertImages = async (editor: Editor, files: File[], pos?: number, gallery?: boolean) => {
    const addImage = latest.current.media?.addImage;
    if (!addImage) return;
    setImageError(undefined);
    const images: JSONContent[] = [];
    for (const file of files) {
      try {
        const processed = await prepareImageForUpload(file);
        if (processed.size > MAX_IMAGE_BYTES) {
          setImageError(`${file.name} is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
          continue;
        }
        images.push({ type: 'image', attrs: { fileKey: addImage(processed) } });
      } catch (error) {
        setImageError(
          error instanceof UnsupportedImageError
            ? "This browser can't read HEIC images; export the photo as JPEG"
            : `${file.name} could not be read`
        );
      }
    }
    if (!images.length || editor.isDestroyed) return;
    const chain = editor.chain().focus();
    if (gallery && images.length > 1)
      return chain.insertContent({ type: 'gallery', content: images }).run();
    if (pos !== undefined) return chain.insertContentAt(pos, images).run();
    // Next to text, the images go in a paragraph of their own below it
    const { $from } = editor.state.selection;
    if ($from.parent.type.name === 'paragraph' && $from.parent.content.size > 0)
      return chain.insertContentAt($from.after(), { type: 'paragraph', content: images }).run();
    chain.insertContent(images).run();
  };

  // Each change is stored as { body, bodyDoc }; hashing is async, so a late result is dropped
  const changeSeq = useRef(0);
  const editor = useEditor({
    extensions,
    content: initialDoc,
    editable: !disabled,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: 'article-editor-content', 'aria-label': 'Article body' } },
    onUpdate: ({ editor }) => {
      const seq = ++changeSeq.current;
      toStoredArticleBody(editor.getJSON()).then((stored) => {
        if (seq === changeSeq.current) latest.current.onChange(stored);
      });
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <ArticleEditorContext.Provider value={media}>
      <div className={`article-editor ${className ?? ''}`}>
        {imageError ? (
          <p
            role="alert"
            className="mb-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {imageError}
          </p>
        ) : null}
        <EditorContent editor={editor} />
        {editor ? <BubbleMenuToolbar editor={editor} /> : null}
      </div>
    </ArticleEditorContext.Provider>
  );
};

export const ArticleEditor = ({ article, ...props }: ArticleEditorProps) => {
  const [initialDoc, setInitialDoc] = useState<JSONContent>();

  useEffect(() => {
    let current = true;
    articleDocOf(article as Parameters<typeof articleDocOf>[0]).then(
      (doc) => current && setInitialDoc(doc.content?.length ? doc : EMPTY_DOC),
      () => current && setInitialDoc(EMPTY_DOC)
    );
    return () => {
      current = false;
    };
    // Read once: the editor owns the document from here
  }, []);

  if (!initialDoc)
    return (
      <div className={`animate-pulse ${props.className ?? ''}`}>
        <div className="mb-2 h-4 w-4/5 rounded bg-foreground/10" />
        <div className="h-4 w-3/5 rounded bg-foreground/10" />
      </div>
    );

  return <ArticleEditorInner initialDoc={initialDoc} {...props} />;
};

// Default export for React.lazy
export default ArticleEditor;
