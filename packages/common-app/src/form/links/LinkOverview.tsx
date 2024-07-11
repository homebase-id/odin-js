import { ActionButton, Times } from '../../ui';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useDotYouClient } from '../../hooks';
import { LinkPreview, getLinkPreview } from '@youfoundation/js-lib/media';
import { LinkPreviewTextual } from '../../media/Link';

export const LinkOverview = ({
  linkPreviews,
  setLinkPreviews,
}: {
  linkPreviews: Record<string, LinkPreview | null>;
  setLinkPreviews: Dispatch<SetStateAction<Record<string, LinkPreview | null>>>;
}) => {
  if (
    !linkPreviews ||
    !Object.keys(linkPreviews).length ||
    !Object.values(linkPreviews).filter(Boolean).length
  )
    return null;

  return (
    <div className="p-4 flex flex-row gap-2">
      {Object.keys(linkPreviews).map((link) => {
        const linkMeta = linkPreviews[link];
        if (!linkMeta) return null;
        return (
          <div className="group relative w-full max-w-lg" key={link}>
            <LinkPreviewTextual
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

export const useLinkPreviewBuilder = (textToSearchIn: string) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  useEffect(() => {
    const foundLinks = textToSearchIn
      ?.split(new RegExp(/(https?:\/\/[^\s]+)/))
      .filter((link) => link && link.startsWith('http'));
    if (!foundLinks) return;

    const removedLinks = Object.keys(linkPreviews).filter((link) => !foundLinks.includes(link));
    setLinkPreviews((old) => {
      const LinkPreviews = { ...old };
      removedLinks.forEach((link) => delete LinkPreviews[link]);
      return LinkPreviews;
    });

    const newLinks = foundLinks.filter(
      (link) => link && link.startsWith('http') && linkPreviews[link] === undefined // Explit check on undefined, as when clared by the user it's null
    );
    if (!newLinks.length) return;

    (async () => {
      const LinkPreviews = (
        await Promise.all(newLinks.map(async (link) => await getLinkPreview(dotYouClient, link)))
      ).filter(Boolean) as LinkPreview[];

      setLinkPreviews((old) => ({
        ...old,
        ...Object.fromEntries(LinkPreviews.map((link) => [link.url, link])),
      }));
    })();
  }, [textToSearchIn]);

  const [linkPreviews, setLinkPreviews] = useState<Record<string, LinkPreview | null>>({});
  return { linkPreviews, setLinkPreviews };
};
