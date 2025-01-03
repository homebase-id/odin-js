import { Article, BlogConfig } from '@homebase-id/js-lib/public';
import { ellipsisAtMaxChar } from '../../helpers';
import { ChannelDefinitionVm } from '../../hooks';
import { FakeAnchor } from '../../ui';
import { AuthorName } from '../Blocks/Author/AuthorName';
import { PostMeta } from '../Blocks/Meta/Meta';
import { HomebaseFile, NewHomebaseFile } from '@homebase-id/js-lib/core';

export const PostTextListItem = ({
  draft,
  channel,
  linkRoot,
  className,
  children,
}: {
  draft: HomebaseFile<Article>;
  channel?: NewHomebaseFile<ChannelDefinitionVm>;
  linkRoot: string;
  className?: string;
  children?: React.ReactNode;
}) => {
  const author = draft.fileMetadata.originalAuthor;

  const content = draft.fileMetadata.appData.content;
  return (
    <>
      <div
        className={`rounded-lg ${className ?? ''} p-3 hover:shadow-md hover:dark:shadow-slate-600`}
        key={draft.fileId}
      >
        <FakeAnchor
          href={`${linkRoot}/${channel?.fileMetadata.appData.content.slug ?? channel?.fileMetadata.appData.uniqueId ?? BlogConfig.PublicChannelSlug}/${
            content.id
          }`}
        >
          <div className="flex flex-col">
            <div className="flex flex-grow flex-col px-4 py-3">
              <div className="text-foreground mb-1 flex flex-col text-opacity-60 md:flex-row md:flex-wrap md:items-center">
                <h2>
                  <AuthorName odinId={author} />
                </h2>
                <span className="hidden px-2 leading-4 md:block">·</span>
                {channel && draft ? (
                  <PostMeta
                    postFile={draft}
                    channel={channel}
                    authorOdinId={draft.fileMetadata.originalAuthor}
                  />
                ) : null}
              </div>
              <div className="flex flex-row justify-between">
                <div>
                  <h1 className={`text-foreground mb-1 text-lg text-opacity-80`}>
                    {content.caption}
                  </h1>
                  <div className="text-foreground leading-relaxed text-opacity-70">
                    {ellipsisAtMaxChar(content.abstract, 280)}
                  </div>
                </div>
                {children}
              </div>
            </div>
          </div>
        </FakeAnchor>
      </div>
    </>
  );
};
