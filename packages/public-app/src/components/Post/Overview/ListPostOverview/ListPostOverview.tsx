import { PostTeaser, t } from '@homebase-id/common-app';
import { PostContent } from '@homebase-id/js-lib/public';
import { useState } from 'react';
import LoginDialog from '../../../Dialog/LoginDialog/LoginDialog';
import { HomebaseFile } from '@homebase-id/js-lib/core';

const ListPostOverview = ({
  blogPosts,
  showChannel,
  showAuthor,
}: {
  blogPosts: HomebaseFile<PostContent>[];
  showChannel?: boolean;
  showAuthor: boolean;
}) => {
  const [isLogin, setIsLogin] = useState(false);

  return (
    <>
      <div className="-my-4 max-w-xl">
        {blogPosts?.map((postFile) => {
          return (
            <PostTeaser
              key={postFile.fileMetadata.appData.content.id}
              postFile={postFile}
              className="my-4"
              hideImageWhenNone={true}
              showChannel={showChannel}
              allowExpand={true}
              login={() => setIsLogin(true)}
              showAuthor={showAuthor}
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
