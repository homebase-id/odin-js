import {
  getPostQueryOptions,
  NotFound,
  useChannels,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { Loader } from '@homebase-id/common-app/icons';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { PostContent } from '@homebase-id/js-lib/public';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const NavigateToReferencedPost = () => {
  const { postKey } = useParams();
  const navigate = useNavigate();
  const identity = useOdinClientContext().getHostIdentity();

  const post = useReferencedPost(postKey);
  useEffect(() => {
    if (post) {
      navigate(
        `${'/apps/feed/preview'}/${identity}/${post.fileMetadata.appData.content.channelId}/${post.fileMetadata.appData.content.slug}`,
        { state: { referrer: `/apps/feed` } }
      );
    }
  }, [post]);

  if (!postKey) {
    return <NotFound />;
  }

  return (
    <div className="h-screen">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col p-5">
        <div className="my-auto flex flex-col">
          <Loader className="mx-auto mb-10 h-20 w-20" />
        </div>
      </div>
    </div>
  );
};

const useReferencedPost = (postKey: string | undefined) => {
  const [post, setPost] = useState<HomebaseFile<PostContent> | null>(null);
  const odinClient = useOdinClientContext();
  const queryClient = useQueryClient();
  const { data: allChannels } = useChannels({ isOwner: true, isAuthenticated: true });

  useEffect(() => {
    if (!postKey || !allChannels) return;

    allChannels?.forEach(async (channel) => {
      const post = await queryClient.fetchQuery(
        getPostQueryOptions(odinClient, queryClient, true, undefined, channel, postKey)
      );
      if (post) {
        setPost(post);
      }
    });
  }, [allChannels]);

  return post;
};
