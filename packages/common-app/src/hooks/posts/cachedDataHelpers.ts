import {
  DotYouClient,
  FileQueryParams,
  GetBatchQueryResultOptions,
  SystemFileType,
  QueryBatchCollectionResponse,
  DEFAULT_QUERY_BATCH_RESULT_OPTION,
} from '@youfoundation/js-lib/core';
import { stringifyArrayToQueryParams } from '@youfoundation/js-lib/helpers';
import {
  PostType,
  BlogConfig,
  GetTargetDriveFromChannelId,
  PostFile,
  dsrToPostFile,
  PostContent,
  ChannelDefinition,
  GetFile,
} from '@youfoundation/js-lib/public';
import { parseChannelTemplate, ChannelDefinitionVm } from './channels/useChannels';

export const getCachedPosts = async (
  dotYouClient: DotYouClient,
  channelId: string,
  postType?: PostType
) => {
  const cachedData = await cachedQuery(dotYouClient);
  const posts =
    cachedData.postsPerChannel
      .find((data) => data.channelId === channelId)
      ?.posts.filter((post) => (postType ? post?.content?.type === postType : true)) ?? [];
  if (!posts.length) return null;

  return { results: posts, cursorState: cachedData.allCursors[channelId] };
};

export const getCachedRecentPosts = async (dotYouClient: DotYouClient, postType?: PostType) => {
  const cachedData = await cachedQuery(dotYouClient);
  if (
    !cachedData ||
    !cachedData.postsPerChannel?.length ||
    cachedData.postsPerChannel.some((perChnl) => !perChnl.posts.length)
  )
    return null;

  const postsPerChannel = cachedData.postsPerChannel;
  const allCursors = cachedData.allCursors;

  const sortedPosts = postsPerChannel
    .flatMap((chnl) => chnl?.posts)
    .filter((post) => (postType ? post?.content?.type === postType : true))
    .sort((a, b) => b.userDate - a.userDate);

  return { results: sortedPosts, cursorState: allCursors };
};

export const fetchCachedPublicChannels = async (dotYouClient: DotYouClient) => {
  const fileData = await GetFile(dotYouClient, 'sitedata.json');
  if (fileData) {
    let channels: ChannelDefinition[] = [];

    fileData.forEach((entry) => {
      const entries = entry.filter(
        (possibleChannel) =>
          possibleChannel.header.fileMetadata.appData.fileType ===
          BlogConfig.ChannelDefinitionFileType
      );
      channels = [
        ...channels,
        ...entries.map((entry) => {
          return {
            ...entry.payload,
            acl: entry.header.serverMetadata.accessControlList,
          } as ChannelDefinition;
        }),
      ];
    });

    if (!channels.length) return null;

    return channels.map((channel) => {
      return {
        ...channel,
        template: parseChannelTemplate(channel?.templateId),
      } as ChannelDefinitionVm;
    });
  }
};

const cachedQuery = async (dotYouClient: DotYouClient) => {
  const pageSize = 30;
  const channels = (await fetchCachedPublicChannels(dotYouClient)) || [];

  const allCursors: Record<string, string> = {};
  const queries: {
    name: string;
    queryParams: FileQueryParams;
    resultOptions?: GetBatchQueryResultOptions | undefined;
  }[] = channels.map((chnl) => {
    const targetDrive = GetTargetDriveFromChannelId(chnl.channelId);
    const params: FileQueryParams = {
      targetDrive: targetDrive,
      dataType: undefined,
      fileType: [BlogConfig.PostFileType],
    };

    const ro: GetBatchQueryResultOptions = {
      maxRecords: pageSize,
      cursorState: undefined,
      includeMetadataHeader: true,
    };

    return {
      name: chnl.channelId,
      queryParams: params,
      resultOptions: ro,
    };
  });

  const response = await queryBatchCachedCollection(dotYouClient, queries);
  const postsPerChannel = await Promise.all(
    response.results.map(async (result) => {
      const targetDrive = GetTargetDriveFromChannelId(result.name);

      const posts: PostFile<PostContent>[] = (
        await Promise.all(
          result.searchResults.map(
            async (dsr) =>
              await dsrToPostFile(dotYouClient, dsr, targetDrive, result.includeMetadataHeader)
          )
        )
      ).filter((post) => !!post) as PostFile<PostContent>[];

      allCursors[result.name] = result.cursorState;

      return { posts, channelId: result.name };
    })
  );

  return { postsPerChannel, allCursors };
};

const queryBatchCachedCollection = async (
  dotYouClient: DotYouClient,
  queries: {
    name: string;
    queryParams: FileQueryParams;
    resultOptions?: GetBatchQueryResultOptions;
  }[],
  systemFileType?: SystemFileType
): Promise<QueryBatchCollectionResponse> => {
  const client = dotYouClient.createAxiosClient({
    headers: {
      'X-ODIN-FILE-SYSTEM-TYPE': systemFileType || 'Standard',
    },
  });

  const updatedQueries = queries.map((query) => {
    const ro = query.resultOptions ?? DEFAULT_QUERY_BATCH_RESULT_OPTION;
    return {
      ...query,
      queryParams: { ...query.queryParams, fileState: query.queryParams.fileState || [1] },
      resultOptionsRequest: ro,
    };
  });

  const requestPromise = (() => {
    const queryParams = stringifyArrayToQueryParams([
      ...updatedQueries.map((q) => ({ name: q.name, ...q.queryParams, ...q.resultOptionsRequest })),
    ]);

    const getUrl = '/builtin/home/data/cacheable/qbc?' + queryParams;
    // Max Url is 1800 so we keep room for encryption overhead
    if ([...(client.defaults.baseURL || ''), ...getUrl].length > 1800) {
      return client.post<QueryBatchCollectionResponse>('/builtin/home/data/cacheable/qbc', {
        queries: updatedQueries,
      });
    } else {
      return client.get<QueryBatchCollectionResponse>(getUrl);
    }
  })();

  return requestPromise.then((response) => response.data);
};
