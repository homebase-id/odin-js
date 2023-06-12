import { PostFile, Article } from '@youfoundation/js-lib/public';
import { ellipsisAtMaxChar } from '../../helpers';
import { ChannelDefinitionVm } from '../../hooks';
import { FakeAnchor } from '../../ui';
import { AuthorName } from '../Blocks/Author/Name';
import { PostMeta } from '../Blocks/Meta/Meta';

export const PostTextListItem = ({
  draft,
  channel,
  linkRoot,
  className,
}: {
  draft: PostFile<Article>;
  channel?: ChannelDefinitionVm;
  linkRoot: string;
  className?: string;
}) => {
  return (
    <>
      <div
        className={`m-3 rounded-lg ${
          className ?? ''
        } p-3 hover:shadow-md hover:dark:shadow-slate-600`}
        key={draft.fileId}
      >
        <FakeAnchor href={`${linkRoot}/${channel?.slug ?? 'public-posts'}/${draft.content.id}`}>
          <div className="flex flex-col">
            <div className="flex flex-grow flex-col px-4 py-3">
              <div className="text-foreground mb-1 flex flex-col text-opacity-60 md:flex-row md:flex-wrap md:items-center">
                <h2>
                  <AuthorName />
                </h2>
                <span className="hidden px-2 leading-4 md:block">·</span>
                {channel && draft ? <PostMeta postFile={draft} channel={channel} /> : null}
              </div>
              <h1 className={`text-foreground mb-1 text-lg text-opacity-80`}>
                {draft.content.caption}
              </h1>
              <div className="text-foreground leading-relaxed text-opacity-70">
                {ellipsisAtMaxChar(draft.content.abstract, 280)}
              </div>
            </div>
          </div>
        </FakeAnchor>
      </div>
    </>
  );
};
