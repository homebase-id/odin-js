import { useEffect, useState } from 'react';
import { Bars, Grid, t } from '@youfoundation/common-app';
import { useFiles } from '../../hooks/files/useFiles';
import Section from '../ui/Sections/Section';
import { Pager } from '@youfoundation/common-app';
import { SystemFileType, TargetDrive } from '@youfoundation/js-lib/core';
import { FileCard } from './FileCard';

const FileBrowser = ({
  targetDrive,
  systemFileType,
}: {
  targetDrive: TargetDrive;
  systemFileType?: SystemFileType;
}) => {
  const {
    data: driveData,
    hasNextPage: hasNextPageOnServer,
    fetchNextPage,
    isFetchedAfterMount,
  } = useFiles({ targetDrive, systemFileType }).fetch;
  const [isListView, setIsListView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isFetchedAfterMount) {
      return;
    }

    if (driveData?.pages[currentPage - 1]) {
      // already have that
    } else {
      fetchNextPage();
    }
  }, [currentPage, isFetchedAfterMount]);

  const hasNextPage = driveData?.pages[currentPage] || hasNextPageOnServer;

  if (
    isFetchedAfterMount &&
    (!driveData?.pages?.length || !driveData?.pages?.[0].searchResults?.length)
  ) {
    return null;
  }

  const currentPageData = driveData?.pages?.[currentPage - 1];
  return (
    <Section
      title={`${t('Files')}${systemFileType ? ` (${systemFileType})` : ''}:`}
      actions={
        <>
          <Pager
            currentPage={currentPage}
            setPage={setCurrentPage}
            totalPages={hasNextPage ? currentPage + 1 : currentPage}
          />
          <div className="flex flex-row rounded-lg border">
            <button
              className={`border-r px-2 py-2 ${isListView ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                setIsListView(true);
              }}
            >
              <Bars className="h-6 w-6" />
            </button>
            <button
              className={`px-2 py-2 ${isListView ? '' : 'bg-slate-200 dark:bg-slate-700'}`}
              onClick={(e) => {
                e.preventDefault();
                setIsListView(false);
              }}
            >
              <Grid className="h-6 w-6" />
            </button>
          </div>
        </>
      }
    >
      {isListView ? (
        <div className="flex flex-col gap-2">
          {currentPageData?.searchResults.map((file) => (
            <FileCard key={file.fileId} file={file} targetDrive={targetDrive} isRow={true} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {currentPageData?.searchResults.map((file) => (
            <FileCard key={file.fileId} file={file} targetDrive={targetDrive} />
          ))}
        </div>
      )}
    </Section>
  );
};

export default FileBrowser;
