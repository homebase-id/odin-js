import { HomebaseFile } from '@homebase-id/js-lib/core';
import { PostContent } from '@homebase-id/js-lib/public';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useHighlightFeedItem = (feedItem: HomebaseFile<PostContent>) => {
  const [searchParams] = useSearchParams();

  const isHighlighted = useMemo(() => {
    const highlightedPostGlobalTransitId = searchParams.get('post');
    return (
      highlightedPostGlobalTransitId &&
      feedItem.fileMetadata.globalTransitId === highlightedPostGlobalTransitId
    );
  }, [feedItem]);

  useEffect(() => {
    // Remove post from search params and replace history
    if (isHighlighted) {
      searchParams.delete('post');
      window.history.replaceState(
        null,
        '',
        [window.location.pathname, searchParams.toString()].filter(Boolean).join('?')
      );
    }
  }, [isHighlighted]);

  return isHighlighted;
};
