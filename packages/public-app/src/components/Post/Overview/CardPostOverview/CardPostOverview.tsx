import { PostTeaser } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { PostContent } from '@youfoundation/js-lib/public';

const CardPostOverview = ({
  blogPosts,
  showAuthor,
}: {
  blogPosts: HomebaseFile<PostContent>[];
  showAuthor: boolean;
}) => {
  return (
    <div className="-m-4 flex flex-wrap">
      {blogPosts?.map((postFile) => {
        return (
          <PostTeaser
            key={postFile.fileMetadata.appData.content.id}
            postFile={postFile}
            className="p-4 md:w-1/2 lg:w-1/3"
            forceAspectRatio={true}
            hideEmbeddedPostMedia={true}
            showAuthor={showAuthor}
          />
        );
      })}
    </div>
  );
};

export default CardPostOverview;
