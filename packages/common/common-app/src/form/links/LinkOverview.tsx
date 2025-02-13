import { ActionButton } from '../../ui';
import { Dispatch, SetStateAction } from 'react';
import { LinkPreview } from '@homebase-id/js-lib/media';
import { LinkPreviewTextual } from '../../media/Link';
import { Times } from '../../ui/Icons';

export const LinkOverview = ({
  linkPreviews,
  setLinkPreviews,
  className,
  cols,
}: {
  linkPreviews: Record<string, LinkPreview | null>;
  setLinkPreviews: Dispatch<SetStateAction<Record<string, LinkPreview | null>>>;
  cols: 3 | 4;
  className?: string;
}) => {
  if (
    !linkPreviews ||
    !Object.keys(linkPreviews).length ||
    !Object.values(linkPreviews).filter(Boolean).length
  )
    return null;

  return (
    <div
      className={`gap-[2px] grid ${
        cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-4' : ''
      }  ${className ?? ''}`}
    >
      {Object.keys(linkPreviews)
        .slice(0, 5)
        .map((link) => {
          const linkMeta = linkPreviews[link];
          if (!linkMeta) return null;

          const removeLink = () => {
            setLinkPreviews((prev) => {
              const newPreviews = { ...prev };
              newPreviews[link] = null;
              return newPreviews;
            });
          };
          return (
            <div
              className="relative w-full max-w-lg hover:bg-slate-200 cursor-pointer"
              key={link}
              onClick={() => {
                removeLink();
              }}
            >
              <LinkPreviewTextual
                key={link}
                linkPreview={linkMeta || { url: link }}
                className="border rounded-md overflow-hidden px-2 py-1 pointer-events-none"
                size="sm"
              />
              <ActionButton
                icon={Times}
                type="mute"
                className="absolute top-0 right-0 opacity-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeLink();
                }}
              />
            </div>
          );
        })}
    </div>
  );
};
