import { useEffect, useMemo, useState } from 'react';
import { LinkPreview, getLinkPreview } from '@homebase-id/js-lib/media';
import { useDotYouClient } from '../auth/useDotYouClient';

export const useLinkPreviewBuilder = (textToSearchIn: string) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const foundLinks = useMemo(
    () =>
      textToSearchIn
        ?.split(new RegExp(/(https?:\/\/[^\s]+)/))
        .filter((link) => link && link.startsWith('http')),
    [textToSearchIn]
  );

  useEffect(() => {
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
  }, [foundLinks]);

  const [linkPreviews, setLinkPreviews] = useState<Record<string, LinkPreview | null>>({});

  // We filter the previews again to avoid showing previews of links that are no longer in the text
  const filteredLinkPreviews = useMemo(() => {
    const filtered: Record<string, LinkPreview | null> = {};
    Object.keys(linkPreviews).forEach((link) => {
      if (foundLinks.includes(link)) {
        filtered[link] = linkPreviews[link];
      }
    });

    return filtered;
  }, [linkPreviews, foundLinks]);
  return { linkPreviews: filteredLinkPreviews, setLinkPreviews };
};
