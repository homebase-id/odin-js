import {
  Article,
  ChannelDefinition,
  getChannelDrive,
  Media,
  PostContent,
  PostFile,
} from '@youfoundation/js-lib';
import { useParams } from 'react-router-dom';
import useBlog from '../../../hooks/blog/useBlog';
import RichTextRenderer from '../../../components/RichTextRenderer/RichTextRenderer';
import RelatedBlogs from '../../../components/Post/Common/RelatedArticles/RelatedArticles';
import { Helmet } from 'react-helmet-async';
import { t } from '@youfoundation/common-app';
import PostMeta from '../../../components/Post/Common/Blocks/Meta/Meta';
import ImageGallery from '../../../components/Post/Common/Blocks/MediaGallery/MediaGallery';
import { PostInteracts } from '../../../components/Post/Common/Blocks/Interacts/Interacts';
import Breadcrumbs from '../../../components/ui/Layout/Breadcrumbs/Breadcrumbs';
import AuthorImage from '../../../components/Post/Common/Blocks/Author/Image';
import AuthorName from '../../../components/Post/Common/Blocks/Author/Name';
import Image from '../../../components/Image/Image';
import Video from '../../../components/Video/Video';
import { LoadingParagraph } from '@youfoundation/common-app';

const PostDetail = () => {
  const { channelKey, postKey } = useParams();
  const { data: postData, isLoading: postDataLoading } = useBlog(
    channelKey && postKey
      ? {
          channelSlug: channelKey,
          blogSlug: postKey,
        }
      : undefined
  );

  if (!postData && !postDataLoading) {
    return (
      <section className="py-5">
        <div className="container mx-auto mb-10 px-5">{t('No post found')}</div>
      </section>
    );
  }

  const post = postData?.activeBlog.content;
  const channel = postData?.activeChannel;

  return (
    <>
      <Helmet>
        <title>{post?.caption ?? ''} | Odin</title>
      </Helmet>

      <section className="py-5">
        <div className="mx-auto mb-10 max-w-3xl sm:px-5 lg:w-2/3">
          <Breadcrumbs
            levels={[
              { title: t('Posts') ?? '', href: `/home/posts` },
              { title: channel?.name ?? '', href: `/home/posts/${channel?.slug}` },
              { title: post?.caption ?? '' },
            ]}
            className="text-sm"
          />
          <PostDetailCard channel={channel} postFile={postData?.activeBlog} />
        </div>
      </section>
      <div className="container mx-auto sm:px-5">
        {postData?.activeBlog?.content?.type === 'Article' && (
          <RelatedBlogs blog={postData?.activeBlog} channel={channel} />
        )}
      </div>
    </>
  );
};

export const PostDetailCard = ({
  odinId,
  channel,
  postFile,
  showAuthorDetail,
  className,
}: {
  odinId?: string;
  channel?: ChannelDefinition;
  postFile?: PostFile<PostContent>;
  showAuthorDetail?: boolean;
  className?: string;
}) => {
  const post = postFile?.content;
  const mediaFiles = (post as Media)?.mediaFiles;

  return (
    <div
      className={`rounded-lg border-gray-200 border-opacity-60 bg-background p-4 dark:border-gray-800 lg:border ${
        className ?? ''
      }`}
    >
      <div className="mb-5 flex w-full flex-col">
        <div className="flex flex-row flex-wrap items-center pb-2 text-gray-500">
          {!post ? (
            <LoadingParagraph className="mb-2 h-8 w-full max-w-xs" />
          ) : (
            <>
              {showAuthorDetail ? (
                <>
                  <AuthorImage
                    odinId={odinId}
                    className="mr-2 h-[2rem] w-[2rem] rounded-full sm:h-[2.5rem] sm:w-[2.5rem]"
                  />
                  <h2>
                    <AuthorName odinId={odinId} />
                  </h2>
                  <span className="px-2 leading-4">·</span>
                </>
              ) : null}
              {post.type === 'Article' && (post as Article)?.readingTimeStats && (
                <>
                  <p className="title-font text-sm font-medium">
                    {Math.ceil((post as Article)?.readingTimeStats?.minutes ?? 0)}
                    {t('min read')}
                  </p>
                  <span className="px-2 leading-4">·</span>
                </>
              )}
              {post && channel ? (
                <PostMeta postFile={postFile} channel={channel} odinId={odinId} size="text-sm" />
              ) : null}
            </>
          )}
        </div>
        {!post ? (
          <LoadingParagraph className="h-8 w-full max-w-xs" />
        ) : (
          <h1
            className={`title-font mb-4 ${
              post.type === 'Article' ? 'text-2xl font-medium sm:text-3xl' : ''
            }`}
          >
            {post.type !== 'Article' && post.captionAsRichText ? (
              <RichTextRenderer
                body={post.captionAsRichText}
                odinId={odinId}
                options={{ linksAlwaysBlank: true }}
              />
            ) : (
              post.caption
            )}
          </h1>
        )}
      </div>

      {post?.primaryMediaFile ? (
        mediaFiles && mediaFiles.length > 1 ? (
          <ImageGallery
            channelId={post.channelId}
            files={mediaFiles}
            className="my-4"
            maxVisible={4}
            postUrl={window.location.pathname}
            odinId={odinId}
            probablyEncrypted={postFile?.payloadIsEncrypted}
          />
        ) : (
          <div className="relative mb-5 sm:w-full">
            {post.primaryMediaFile.type === 'image' ? (
              <Image
                odinId={odinId}
                className="rounded object-cover object-center"
                fileId={post.primaryMediaFile.fileId}
                targetDrive={getChannelDrive(post.channelId)}
                alt="blog"
                previewThumbnail={postFile?.previewThumbnail}
                probablyEncrypted={postFile?.payloadIsEncrypted}
              />
            ) : (
              <Video
                targetDrive={getChannelDrive(post.channelId)}
                fileId={post.primaryMediaFile.fileId}
                odinId={odinId}
                className={`w-full rounded object-cover object-center`}
                probablyEncrypted={postFile?.payloadIsEncrypted}
              />
            )}
          </div>
        )
      ) : null}

      {post?.type === 'Article' ? (
        <p className="mb-5 text-base leading-relaxed text-gray-500">
          {(post as Article)?.abstract}
        </p>
      ) : null}

      {!post ? (
        <>
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
          <LoadingParagraph className="mb-2 h-4 w-full" />
        </>
      ) : (
        post.type === 'Article' && (
          <div className="rich-text-content mb-5 leading-relaxed">
            <RichTextRenderer
              odinId={odinId}
              body={(post as Article)?.body}
              imageDrive={getChannelDrive(post.channelId)}
              options={{ linksAlwaysBlank: true }}
            />
          </div>
        )
      )}
      {postFile ? (
        <PostInteracts
          authorOdinId={odinId || window.location.hostname}
          postFile={postFile}
          defaultExpanded={true}
        />
      ) : null}
    </div>
  );
};

export default PostDetail;
