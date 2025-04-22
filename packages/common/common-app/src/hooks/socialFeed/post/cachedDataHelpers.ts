import {
  OdinClient,
  FileQueryParams,
  GetBatchQueryResultOptions,
  SystemFileType,
  QueryBatchCollectionResponse,
  DEFAULT_QUERY_BATCH_RESULT_OPTION,
  HomebaseFile,
} from '@homebase-id/js-lib/core';
import {
  stringGuidsEqual,
  stringifyArrayToQueryParams,
  tryJsonParse,
} from '@homebase-id/js-lib/helpers';
import {
  PostType,
  BlogConfig,
  GetTargetDriveFromChannelId,
  dsrToPostFile,
  PostContent,
  ChannelDefinition,
  GetFile,
} from '@homebase-id/js-lib/public';
import { parseChannelTemplate, ChannelDefinitionVm } from '../channels/useChannels';

export const getCachedPosts = async (
  odinClient: OdinClient,
  channelId: string,
  postType?: PostType
) => {
  const cachedData = await cachedQuery(odinClient);
  const posts =
    cachedData.postsPerChannel
      .find((data) => stringGuidsEqual(data.channelId, channelId))
      ?.posts.filter((post) =>
        postType ? post?.fileMetadata.appData.content?.type === postType : true
      ) ?? [];
  if (!posts.length) return null;

  return { results: posts, cursorState: cachedData.allCursors[channelId] };
};

export const getCachedRecentPosts = async (odinClient: OdinClient, postType?: PostType) => {
  const cachedData = await cachedQuery(odinClient);
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
    .filter((post) => (postType ? post?.fileMetadata.appData.content?.type === postType : true))
    .sort(
      (a, b) =>
        (b.fileMetadata.appData.userDate || b.fileMetadata.created) -
        (a.fileMetadata.appData.userDate || a.fileMetadata.created)
    );

  return { results: sortedPosts, cursorState: allCursors };
};

export const fetchCachedPublicChannels = async (odinClient: OdinClient) => {
  const fileData = await GetFile(odinClient, 'sitedata.json');
  if (fileData) {
    let channels: HomebaseFile<ChannelDefinitionVm>[] = [];

    fileData.forEach((entry) => {
      const entries = entry.filter(
        (possibleChannel) =>
          possibleChannel.header.fileMetadata.appData.fileType ===
          BlogConfig.ChannelDefinitionFileType
      );
      channels = [
        ...channels,
        ...entries.map((entry) => {
          const parsedContent = tryJsonParse<ChannelDefinition>(
            entry.header.fileMetadata.appData.content
          );
          return {
            ...entry.header,
            fileMetadata: {
              ...entry.header.fileMetadata,
              appData: {
                ...entry.header.fileMetadata.appData,
                content: {
                  ...parsedContent,
                  template: parseChannelTemplate(parsedContent?.templateId),
                },
              },
            },
          } as HomebaseFile<ChannelDefinitionVm>;
        }),
      ];
    });

    if (!channels.length) return null;
    return channels;
  }
};

const cachedQuery = async (odinClient: OdinClient) => {
  const pageSize = 30;
  const channels = (await fetchCachedPublicChannels(odinClient)) || [];
  const allCursors: Record<string, string> = {};
  const queries: {
    name: string;
    queryParams: FileQueryParams;
    resultOptions?: GetBatchQueryResultOptions | undefined;
  }[] = channels
    .filter((chnl) => chnl.fileMetadata.appData.content.showOnHomePage)
    .map((chnl) => {
      const targetDrive = GetTargetDriveFromChannelId(chnl.fileMetadata.appData.uniqueId as string);
      const params: FileQueryParams = {
        targetDrive: targetDrive,
        dataType: undefined,
        fileType: [BlogConfig.PostFileType],
      };

      const ro: GetBatchQueryResultOptions = {
        maxRecords: pageSize,
        cursorState: undefined,
        includeMetadataHeader: true,
        ordering: 'newestFirst',
        sorting: 'userDate',
      };

      return {
        name: chnl.fileMetadata.appData.uniqueId as string,
        queryParams: params,
        resultOptions: ro,
      };
    });

  const response = await queryBatchCachedCollection(odinClient, queries);
  const postsPerChannel = await Promise.all(
    response.results.map(async (result) => {
      const targetDrive = GetTargetDriveFromChannelId(result.name);

      const posts: HomebaseFile<PostContent>[] = (
        await Promise.all(
          result.searchResults.map(
            async (dsr) =>
              await dsrToPostFile(odinClient, dsr, targetDrive, result.includeMetadataHeader)
          )
        )
      ).filter((post) => !!post) as HomebaseFile<PostContent>[];

      allCursors[result.name] = result.cursorState;

      return { posts, channelId: result.name };
    })
  );

  return { postsPerChannel, allCursors };
};

const queryBatchCachedCollection = async (
  odinClient: OdinClient,
  queries: {
    name: string;
    queryParams: FileQueryParams;
    resultOptions?: GetBatchQueryResultOptions;
  }[],
  systemFileType?: SystemFileType
): Promise<QueryBatchCollectionResponse> => {
  const client = odinClient.createAxiosClient({
    systemFileType,
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
