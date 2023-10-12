import { PostTeaser, t } from '@youfoundation/common-app';
import { PostContent, PostFile } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import LoginDialog from '../../../Dialog/LoginDialog/LoginDialog';

const ListPostOverview = ({
  blogPosts,
  showChannel,
}: {
  blogPosts: PostFile<PostContent>[];
  showChannel?: boolean;
}) => {
  const [isLogin, setIsLogin] = useState(false);

  return (
    <>
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
              login={() => setIsLogin(true)}
            />
          );
        })}
      </div>
      <LoginDialog
        isOpen={isLogin}
        onCancel={() => setIsLogin(false)}
        title={t('Login required')}
        returnPath={window.location.pathname}
      />
    </>
  );
};

export default ListPostOverview;
