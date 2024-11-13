import { PostTeaser } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { PostContent } from '@homebase-id/js-lib/public';
import { useCallback, useEffect, useState } from 'react';

const MasonryPostOverview = ({
  blogPosts,
  showAuthor,
}: {
  blogPosts: HomebaseFile<PostContent>[];
  showAuthor: boolean;
}) => {
  const [cols, setCols] = useState(1);

  /// Function to reorder the array to make it fit in the masonry layout which by
  ///  default is ordered from top to bottom, instead of left to right
  ///  credit: https://github.com/jessekorzan/masonry-css-js/blob/master/src/App.js
  const reorder = (arr: HomebaseFile<PostContent>[], columns: number) => {
    const cols = columns;
    const out = [];
    let col = 0;
    while (col < cols) {
      for (let i = 0; i < arr.length; i += cols) {
        const _val = arr[i + col];
        if (_val !== undefined) out.push(_val);
      }
      col++;
    }
    return out;
  };

  const calculateCols = useCallback(() => {
    const windowWidth = document.documentElement.clientWidth;
    const cols = windowWidth >= 1280 ? 4 : windowWidth >= 1024 ? 3 : windowWidth >= 640 ? 2 : 1;
    setCols(cols);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', calculateCols);

    calculateCols();

    return () => {
      window.removeEventListener('resize', calculateCols);
    };
  }, [calculateCols]);

  return (
    <div className={`-my-4 gap-4 sm:columns-2 lg:columns-3 xl:columns-4`}>
      {reorder(blogPosts, cols).map((postFile) => {
        return (
          <PostTeaser
            className="break-inside-avoid py-2"
            key={postFile.fileMetadata.appData.content.id}
            postFile={postFile}
            hideImageWhenNone={true}
            hideEmbeddedPostMedia={true}
            showAuthor={showAuthor}
          />
        );
      })}
    </div>
  );
};

export default MasonryPostOverview;
