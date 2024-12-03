import { ReactNode } from 'react';
import { LoadingBlock } from '@homebase-id/common-app';

const LoadingDetailPage = ({ children }: { children?: ReactNode }) => {
  return (
    <>
      <section>
        <div
          className={`-mx-2 -mt-4 mb-4 border-b border-gray-100 bg-white px-2 py-1 dark:border-gray-800 dark:bg-black sm:-mx-10 sm:-mt-8 sm:px-10 xl:py-4`}
        >
          <LoadingBlock className="mb-2 h-4 max-w-xs" />
          <LoadingBlock className="flex h-10 max-w-md flex-row" />
        </div>
        {children}
      </section>
    </>
  );
};

export default LoadingDetailPage;
