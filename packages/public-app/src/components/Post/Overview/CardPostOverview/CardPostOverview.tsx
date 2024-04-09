import { PostTeaser } from '@youfoundation/common-app';
import { HomebaseFile } from '@youfoundation/js-lib/core';
import { PostContent } from '@youfoundation/js-lib/public';

const CardPostOverview = ({ blogPosts }: { blogPosts: HomebaseFile<PostContent>[] }) => {
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
          />
        );
      })}
    </div>
  );
};

export default CardPostOverview;
