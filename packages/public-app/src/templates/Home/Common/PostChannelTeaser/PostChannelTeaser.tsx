import { getChannelDrive, PostContent, PostFile } from '@youfoundation/js-lib/public';
import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ChannelDefinitionVm,
  HOME_ROOT_PATH,
  useBlogPostsInfinite,
} from '@youfoundation/common-app';
import { Arrow, Image, Video } from '@youfoundation/common-app';

import { t } from '@youfoundation/common-app';
import { ActionLink } from '@youfoundation/common-app';

import './PostChannelTeaser.css';

interface PostChannelTeaserProps {
  className?: string;
  title: string;
  channel: ChannelDefinitionVm;
  fallback: ReactNode;
}

export const PostChannelTeaser: FC<PostChannelTeaserProps> = ({
  className,
  title,
  channel,
  fallback,
}) => {
  const [index, setIndex] = useState(0);
  const [disableAutomaticIndexCalculcation, setDisableAutomaticIndexCalculation] = useState(false);
  const [maxIndex, setMaxIndex] = useState(1);
  const [clientWidth, setClientWidth] = useState<number>();
  const scrollContainer = useRef<HTMLDivElement>(null);

  const { data: blogPosts, isFetched: blogsFetched } = useBlogPostsInfinite({
    channelId: channel?.channelId,
  });
  const flattenedPosts = blogPosts ? blogPosts?.pages?.flatMap((page) => page.results) : [];

  const doScroll = (direction: number) => {
    if (scrollContainer?.current) {
      const newIndex = index + direction;
      setIndex(newIndex);
      setDisableAutomaticIndexCalculation(true);

      scrollContainer.current.scrollTo({
        left: newIndex * scrollContainer.current.clientWidth,
        behavior: 'smooth',
      });
      setMaxIndex(scrollContainer.current.scrollWidth / scrollContainer.current.clientWidth - 1);
    }
  };

  const calculateIndex = () => {
    if (scrollContainer?.current && !disableAutomaticIndexCalculcation) {
      const calculcatedIndex =
        scrollContainer.current.scrollLeft / scrollContainer.current.clientWidth;
      setIndex(calculcatedIndex);
    }
  };

  useEffect(() => {
    if (disableAutomaticIndexCalculcation) {
      setTimeout(() => {
        setDisableAutomaticIndexCalculation(false);
      }, 1000);
    }
  }, [disableAutomaticIndexCalculcation]);

  useEffect(() => {
    const handleResize = () => setClientWidth(document.documentElement.clientWidth);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  useEffect(() => {
    // calculate index on load to ensure that there was no scroll state enforced by the browser
    calculateIndex();
  }, []);

  if (!flattenedPosts?.length && blogsFetched) {
    return <>{fallback}</> || null;
  }

  const dirtyScreenW = 'mx-[calc((100vw-100%)/-2)] w-[100vw] px-[calc((100vw-100%)/2)]';
  return (
    <section
      className={`body-font mb-10 overflow-hidden rounded-lg border-gray-200 border-opacity-60 bg-background py-6 dark:border-gray-800 sm:mx-0 sm:w-auto
      sm:max-w-none sm:px-5 lg:border ${dirtyScreenW} ${className ?? ''}`}
      style={{
        width: `${clientWidth}px`,
        marginLeft: `calc((${clientWidth}px - 100%) / -2)`,
        marginRight: `calc((${clientWidth}px - 100%) / -2)`,
        paddingLeft: `calc((${clientWidth}px - 100%) / 2)`,
        paddingRight: `calc((${clientWidth}px - 100%) / 2)`,
      }}
    >
      <div className="mb-5 flex flex-row flex-wrap items-center">
        <h2 className="text-2xl">{title}</h2>
        <ActionLink
          href={`${HOME_ROOT_PATH}posts/${channel.slug ? channel.slug + '/' : ''}`}
          className="ml-auto"
          icon={Arrow}
          type="mute"
        >
          {t('See all')}
        </ActionLink>
      </div>
      <div className="relative w-full">
        <div
          className="overflow-vertical-hidden overflow-horizontal-scroll flex w-full flex-nowrap"
          ref={scrollContainer}
          onScroll={calculateIndex}
        >
          {flattenedPosts?.map((postFile) => {
            return (
              <PostTeaser
                className="w-1/2 sm:w-1/3 md:w-1/4 xl:w-1/6"
                postFile={postFile}
                linkRoot={`${HOME_ROOT_PATH}posts/${channel.slug ? channel.slug + '/' : ''}`}
                key={postFile?.fileId}
              />
            );
          })}
        </div>
        {index !== 0 ? (
          <div className="absolute bottom-20 left-[-1.6rem] top-0 hidden w-14 flex-col justify-center bg-opacity-25 px-2 sm:flex">
            <button
              className=" rounded-full bg-gray-100 p-2 dark:bg-gray-900"
              onClick={() => doScroll(-1)}
            >
              <Arrow className="rotate-180" />
            </button>
          </div>
        ) : null}
        {index < maxIndex ? (
          <div className="absolute bottom-20 right-[-1.6rem] top-0 hidden w-14 flex-col justify-center bg-opacity-25 px-2 sm:flex">
            <button
              className="rounded-full bg-gray-100 p-2 dark:bg-gray-900"
              onClick={() => doScroll(+1)}
            >
              <Arrow />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

interface PostTeaserProps {
  className: string;
  postFile: PostFile<PostContent>;
  linkRoot: string;
}

const PostTeaser: FC<PostTeaserProps> = ({
  className,
  postFile: { content: blog, previewThumbnail, isEncrypted, lastModified },
  linkRoot,
}) => {
  return (
    <div className={`mb-0 h-full flex-shrink-0 flex-grow-0 p-1 ${className}`}>
      <Link to={linkRoot + (blog.slug ?? '#')} className="flex flex-col">
        <div className="aspect-video overflow-hidden transition-transform duration-300 hover:scale-110">
          {blog.primaryMediaFile ? (
            blog.primaryMediaFile.type !== 'video' ? (
              <Image
                className="h-full w-full object-cover object-center"
                fileId={blog.primaryMediaFile.fileId}
                fileKey={blog.primaryMediaFile.fileKey}
                lastModified={lastModified}
                targetDrive={getChannelDrive(blog.channelId)}
                alt="blog"
                fit="cover"
                previewThumbnail={previewThumbnail}
                probablyEncrypted={isEncrypted}
              />
            ) : (
              <Video
                targetDrive={getChannelDrive(blog.channelId)}
                fileId={blog.primaryMediaFile.fileId}
                fileKey={blog.primaryMediaFile.fileKey}
                lastModified={lastModified}
                className={className}
                probablyEncrypted={isEncrypted}
                previewThumbnail={previewThumbnail}
              />
            )
          ) : (
            <div className="flex h-full items-center bg-slate-200 p-2  text-center dark:bg-slate-700">
              {blog.caption}
            </div>
          )}
        </div>
        <h2 className="title-font fade-overflow max-h-16 whitespace-normal break-words pt-2 text-lg text-opacity-90">
          {blog.caption}
        </h2>
      </Link>
    </div>
  );
};
