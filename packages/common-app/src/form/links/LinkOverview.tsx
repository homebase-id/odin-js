import { ellipsisAtMaxChar } from '../../helpers/common';
import { getHostFromUrl } from '@youfoundation/js-lib/helpers';
import { ActionButton, Times } from '../../ui';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useDotYouClient } from '../../hooks';
import { NewLinkPreview, getLinkPreview } from '@youfoundation/js-lib/media';

export const LinkOverview = ({
  linkPreviews,
  setLinkPreviews,
}: {
  linkPreviews: Record<string, NewLinkPreview | null>;
  setLinkPreviews: Dispatch<SetStateAction<Record<string, NewLinkPreview | null>>>;
}) => {
  if (!linkPreviews || !Object.keys(linkPreviews).length) {
    return null;
  }

  return (
    <div className="p-4 flex flex-row gap-2">
      {Object.keys(linkPreviews).map((link) => {
        const linkMeta = linkPreviews[link];
        if (!linkMeta) return null;
        return (
          <div className="group relative w-full max-w-lg" key={link}>
            <LinkOverviewItem
              key={link}
              linkPreview={linkMeta || { url: link }}
              className="border rounded-md overflow-hidden px-2 py-1"
              size="sm"
            />
            <ActionButton
              icon={Times}
              type="mute"
              className="absolute top-0 right-0"
              onClick={() => {
                setLinkPreviews((prev) => {
                  const newPreviews = { ...prev };
                  newPreviews[link] = null;
                  return newPreviews;
                });
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

const LinkOverviewItem = ({
  linkPreview,
  size,
  className,
}: {
  linkPreview: NewLinkPreview;
  size?: 'sm' | 'md';
  className?: string;
}) => {
  return (
    <a
      className={`block group w-full max-w-lg ${className || ''}`}
      href={linkPreview.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="">
        <p className="capitalize font-bold">{getHostFromUrl(linkPreview.url)}</p>
        <p
          className={`text-sm text-primary group-hover:underline ${size === 'sm' ? 'max-h-[1.3rem] overflow-hidden' : ''}`}
        >
          {ellipsisAtMaxChar(linkPreview.title || linkPreview.url, size !== 'sm' ? 120 : 40)}
        </p>
        {size !== 'sm' ? (
          <p className="text-sm">{ellipsisAtMaxChar(linkPreview.description, 140)}</p>
        ) : null}
      </div>

      {size !== 'sm' ? (
        <img
          src={linkPreview.imageUrl}
          alt={linkPreview.url}
          className="border rounded-lg max-w-[70%]"
        />
      ) : null}
    </a>
  );
};

export const useLinkPreviewBuilder = (textToSearchIn: string) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  useEffect(() => {
    const foundLinks = textToSearchIn
      ?.split(new RegExp(/(https?:\/\/[^\s]+)/))
      .filter((link) => link && link.startsWith('http'));
    if (!foundLinks) return;

    const removedLinks = Object.keys(linkPreviews).filter((link) => !foundLinks.includes(link));
    setLinkPreviews((old) => {
      const newLinkPreviews = { ...old };
      removedLinks.forEach((link) => delete newLinkPreviews[link]);
      return newLinkPreviews;
    });

    const newLinks = foundLinks.filter(
      (link) => link && link.startsWith('http') && linkPreviews[link] === undefined // Explit check on undefined, as when clared by the user it's null
    );
    if (!newLinks.length) return;

    (async () => {
      const newLinkPreviews = (
        await Promise.all(newLinks.map(async (link) => await getLinkPreview(dotYouClient, link)))
      ).filter(Boolean) as NewLinkPreview[];

      setLinkPreviews((old) => ({
        ...old,
        ...Object.fromEntries(newLinkPreviews.map((link) => [link.url, link])),
      }));
    })();
  }, [textToSearchIn]);

  const [linkPreviews, setLinkPreviews] = useState<Record<string, NewLinkPreview | null>>({});
  return { linkPreviews, setLinkPreviews };
};

// <div className={`flex flex-row max-w-lg ${className || ''}`}>
//   <ActionButton icon={Times} type="mute" className="mb-auto" />
//   <a
//     className={`border-l border-l-4 ${size === 'sm' ? 'pl-2' : 'pl-4'} group`}
//     href={linkPreview.url}
//     target="_blank"
//     rel="noopener noreferrer"
//   >
//     <div className="">
//       <p className="capitalize font-bold">{getHostFromUrl(linkPreview.url)}</p>
//       <p className="text-sm text-primary group-hover:underline">
//         {ellipsisAtMaxChar(linkPreview.title || linkPreview.url, 120)}
//       </p>
//       {size !== 'sm' ? (
//         <p className="text-sm">{ellipsisAtMaxChar(linkPreview.description, 140)}</p>
//       ) : null}
//     </div>

//     {size !== 'sm' ? (
//       <img src={imageUrl} alt={linkPreview.url} className="border rounded-lg max-w-[70%]" />
//     ) : null}
//   </a>
// </div>
