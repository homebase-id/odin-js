import { ReactNode } from 'react';
import { LoadingBlock } from '@homebase-id/common-app';

const LoadingDetailPage = ({ children }: { children?: ReactNode }) => {
  return (
    <>
      <section>
        <div
          className={`-mx-10 -mt-8 mb-10 h-[10rem] animate-pulse border-b-2 border-gray-100 bg-white px-10 pt-20 dark:border-gray-700 dark:bg-black sm:pt-8`}
        >
          <LoadingBlock className="mb-2 h-4 max-w-xs" />
          <LoadingBlock className="mb-5 flex h-10 max-w-md flex-row" />
        </div>
        {children}
      </section>
    </>
  );
};

export default LoadingDetailPage;
