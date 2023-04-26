import { PostContent, PostFile } from '@youfoundation/js-lib';
import PostTeaser from '../../Common/Card/PostTeaser';

const CardPostOverview = ({ blogPosts }: { blogPosts: PostFile<PostContent>[] }) => {
  return (
    <div className="-m-4 flex flex-wrap">
      {blogPosts?.map((postFile) => {
        return (
          <PostTeaser
            key={postFile.content.id}
            postFile={postFile}
            className="p-4 md:w-1/2 lg:w-1/3"
            forceAspectRatio={true}
          />
        );
      })}
    </div>
  );
};

export default CardPostOverview;
