import PostTeaser from '@youfoundation/common-app/src/socialFeed/Card/PostTeaser';
import { PostContent, PostFile } from '@youfoundation/js-lib/public';

const ListPostOverview = ({
  blogPosts,
  showChannel,
}: {
  blogPosts: PostFile<PostContent>[];
  showChannel?: boolean;
}) => {
  return (
    <div className="-my-4 max-w-xl">
      {blogPosts?.map((postFile) => {
        return (
          <PostTeaser
            key={postFile.content.id}
            postFile={postFile}
            className="my-4"
            hideImageWhenNone={true}
            showChannel={showChannel}
            allowExpand={true}
          />
        );
      })}
    </div>
  );
};

export default ListPostOverview;
