import { PostTeaser, t } from '@youfoundation/common-app';
import { PostContent } from '@youfoundation/js-lib/public';
import { useState } from 'react';
import LoginDialog from '../../../Dialog/LoginDialog/LoginDialog';
import { DriveSearchResult } from '@youfoundation/js-lib/core';

const ListPostOverview = ({
  blogPosts,
  showChannel,
}: {
  blogPosts: DriveSearchResult<PostContent>[];
  showChannel?: boolean;
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
