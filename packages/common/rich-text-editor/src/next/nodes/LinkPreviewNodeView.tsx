/**
 * From journal's LinkPreviewNodeView: a card for a pasted link. A card without a title or
 * description fetches its preview once, through the identity's link extractor (as the feed's post
 * composer does), and stores it in the node.
 */
import { useEffect, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { ExternalLink, Link2 } from 'lucide-react';
import { getLinkPreview } from '@homebase-id/js-lib/media';
import { useDotYouClientContext } from '@homebase-id/common-app';

const isHttp = (url: unknown): url is string =>
  typeof url === 'string' && /^https?:\/\//i.test(url);

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const LinkPreviewNodeView = ({
  node,
  editor,
  updateAttributes,
  getPos,
  selected,
}: NodeViewProps) => {
  const dotYouClient = useDotYouClientContext();
  const { url, title, description, image } = node.attrs as {
    url: string;
    title: string;
    description: string;
    image: string | null;
  };
  const [failed, setFailed] = useState(false);
  const hasPreview = Boolean(title || description);
  const shouldFetch = !hasPreview && editor.isEditable && isHttp(url);

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;
    getLinkPreview(dotYouClient, url).then(
      (preview) => {
        if (cancelled) return;
        if (!preview || !(preview.title || preview.description)) return setFailed(true);
        updateAttributes({
          title: preview.title || '',
          description: preview.description || '',
          // Only a linked image: an embedded one would weigh the article down
          image: isHttp(preview.imageUrl) ? preview.imageUrl : null,
          imageWidth: preview.imageWidth ?? null,
          imageHeight: preview.imageHeight ?? null,
        });
      },
      () => !cancelled && setFailed(true)
    );
    return () => {
      cancelled = true;
    };
  }, [shouldFetch, dotYouClient, url]);

  const host = hostOf(url);
  const loading = shouldFetch && !failed;

  const convert = () => {
    const pos = getPos();
    if (typeof pos === 'number') editor.chain().focus().convertLinkPreviewToLink(pos).run();
  };

  const action =
    'flex h-9 w-9 items-center justify-center rounded-md text-foreground/60 hover:bg-foreground/10 hover:text-foreground';

  return (
    <NodeViewWrapper
      data-link-preview=""
      data-url={url}
      data-drag-handle
      className={`my-4 flex flex-col overflow-hidden rounded-lg border border-foreground/15 sm:flex-row ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
    >
      {hasPreview && isHttp(image) ? (
        <img
          src={image}
          alt=""
          draggable={false}
          className="h-40 w-full shrink-0 object-cover sm:h-auto sm:w-40"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 items-start gap-1 px-4 py-3">
        <div className="min-w-0 flex-1">
          {hasPreview ? (
            <>
              <div className="truncate font-semibold">{title || host}</div>
              {description ? (
                <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{description}</p>
              ) : null}
              <div className="mt-1 truncate text-xs text-foreground/50">{host}</div>
            </>
          ) : loading ? (
            <>
              <div className="truncate text-xs text-foreground/50">{host}</div>
              <div aria-hidden className="mt-2 h-4 w-3/4 animate-pulse rounded bg-foreground/10" />
              <div
                aria-hidden
                className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-foreground/10"
              />
            </>
          ) : (
            <>
              <div className="truncate font-semibold">{host}</div>
              <div className="truncate text-sm text-foreground/60">{url}</div>
            </>
          )}
        </div>
        <div
          contentEditable={false}
          onMouseDown={(e) => e.preventDefault()}
          className="-my-1 -mr-2 flex shrink-0"
        >
          {isHttp(url) ? (
            <button
              type="button"
              aria-label="Open link"
              title="Open link"
              className={action}
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          ) : null}
          {editor.isEditable ? (
            <button
              type="button"
              aria-label="Convert to link"
              title="Convert to link"
              className={action}
              onClick={convert}
            >
              <Link2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </NodeViewWrapper>
  );
};
