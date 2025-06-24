import {
    t,
    FakeAnchor,
    useSocialFeed,
    AuthorImage,
    AuthorName,
    DoubleClickHeartForMedia,
    ErrorBoundary,
    PostBody,
    PostMeta,
    useChannel,
    useCheckIdentity,
    useDotYouClientContext,
    LoadingBlock,
} from '@homebase-id/common-app';
import {UnreachableIdentity} from '@homebase-id/feed-app/src/components/SocialFeed/UnreachableIdentity';
import {HomebaseFile} from '@homebase-id/js-lib/core';
import {PostContent} from '@homebase-id/js-lib/public';

const POSTS_TO_SHOW = 2;
export const FeedTeaser = ({className}: { className?: string }) => {
    const {data: posts, isFetched} = useSocialFeed({pageSize: POSTS_TO_SHOW}).fetchAll;
    const latestPosts = posts?.pages?.[0]?.results;

    const hasPosts = latestPosts && latestPosts?.length;

    return (
        <div className={className}>
            <div className="mb-4 flex flex-row items-center justify-between">
                <p className="text-2xl">{t('What has everyone been up to?')}</p>
            </div>
            <FakeAnchor className="w-full" href={hasPosts ? `/apps/feed` : `/owner/connections`}>
                <div className="pointer-events-none flex w-full flex-col gap-4">
                    {hasPosts ? (
                        latestPosts.slice(0, POSTS_TO_SHOW).map((post, index) => (
                            <div
                                className={`w-full rounded-md bg-background ${index !== 0 ? 'hidden lg:block' : ''}`}
                                key={post.fileId}
                            >
                                <PostTeaser postFile={post}/>
                            </div>
                        ))
                    ) : isFetched ? (
                        <p className="rounded-md bg-background px-4 py-4 text-slate-400">
                            {t('Fill up your feed, by following people, or connecting with other identities')}
                        </p>
                    ) : (
                        <>
                            <LoadingBlock className="h-44 w-full bg-background"/>
                            <LoadingBlock className="h-44 w-full bg-background"/>
                        </>
                    )}
                </div>
            </FakeAnchor>
        </div>
    );
};

const PostTeaser = ({
                        postFile,
                        className,
                    }: {
    postFile: HomebaseFile<PostContent>;
    className?: string;
}) => {
    const post = postFile.fileMetadata.appData.content;
    const loggedOnIdentity = useDotYouClientContext().getLoggedInIdentity();

    let odinId = postFile.fileMetadata.senderOdinId
    let channelId = post.channelId;

    let usingRemotePayload = false;
    if (postFile.fileMetadata.dataSource?.payloadsAreRemote === true) {
        odinId = postFile.fileMetadata.dataSource.identity;
        channelId = postFile.fileMetadata.dataSource.driveId;
        usingRemotePayload = true;
    }

    const isExternal = odinId && odinId !== loggedOnIdentity;

    const {data: identityAccessible} = useCheckIdentity(isExternal ? odinId : undefined);

    const {data: channel} = useChannel({
        odinId: isExternal ? odinId : undefined,
        channelKey: channelId
    }).fetch;

    const authorOdinId = postFile.fileMetadata.originalAuthor || odinId;

    if (identityAccessible === false && isExternal)
        return <UnreachableIdentity postFile={postFile} className={className} odinId={odinId}/>;

    return (
        <div className={`w-full break-words rounded-lg ${className ?? ''}`}>
            <ErrorBoundary>
                <div
                    className={`relative flex h-full flex-col rounded-lg border-gray-200 border-opacity-60 transition-colors dark:border-gray-800 lg:border`}
                >
                    <div className="flex flex-row gap-4 px-3 py-3 sm:px-4">
                        <div className="flex-shrink-0 py-1">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-[4rem] md:w-[4rem]">
                                <AuthorImage
                                    odinId={authorOdinId}
                                    className="h-10 w-10 rounded-full sm:h-12 sm:w-12 md:h-[4rem] md:w-[4rem]"
                                />
                            </div>
                        </div>
                        <div className="flex w-20 flex-grow flex-col">
                            <div className="mb-1 flex flex-col text-foreground text-opacity-60 md:flex-row md:flex-wrap md:items-center">
                                <h2>
                                    <AuthorName odinId={authorOdinId}/>
                                </h2>
                                <span className="hidden px-2 leading-4 md:block">{usingRemotePayload ? "~" : "·"}</span>

                                <PostMeta
                                    postFile={postFile}
                                    channel={channel || undefined}
                                    odinId={odinId}
                                    authorOdinId={authorOdinId}
                                    excludeContextMenu={true}
                                />
                            </div>

                            <PostBody
                                post={post}
                                odinId={odinId}
                                fileId={postFile.fileId}
                                globalTransitId={postFile.fileMetadata.globalTransitId}
                                lastModified={postFile.fileMetadata.updated}
                                payloads={postFile.fileMetadata.payloads}
                            />
                        </div>
                    </div>
                    <DoubleClickHeartForMedia
                        odinId={odinId}
                        postFile={postFile}
                        onClick={undefined}
                        className="mb-4"
                    />
                </div>
            </ErrorBoundary>
        </div>
    );
};
