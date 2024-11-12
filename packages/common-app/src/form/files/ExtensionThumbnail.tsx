import {
  FileCsv,
  FileExcel,
  FileMp3,
  FilePdf,
  FilePpt,
  FileWord,
  FileZip,
} from '../../ui/Icons/FileType';
import { File as FileIcon } from '../../ui/Icons/File';

export const ExtensionThumbnail = ({
  contentType,
  className,
}: {
  contentType: string;
  className?: string;
}) => {
  const contentTypeExtension = contentType.split('/')[1];

  if (
    contentTypeExtension === 'xls' ||
    contentTypeExtension === 'xlsx' ||
    contentTypeExtension === 'xlsm' ||
    contentTypeExtension === 'xlsb' ||
    contentTypeExtension === 'xlt' ||
    contentTypeExtension === 'xltx' ||
    contentTypeExtension === 'xltm' ||
    contentTypeExtension === 'vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return <FileExcel className={className} />;

  if (
    contentTypeExtension === 'docx' ||
    contentTypeExtension === 'doc' ||
    contentTypeExtension === 'dotx' ||
    contentTypeExtension === 'dot' ||
    contentTypeExtension ===
      'contentTypeExtension vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return <FileWord className={className} />;

  if (contentTypeExtension === 'pdf') return <FilePdf className={className} />;

  if (
    contentTypeExtension === 'pptx' ||
    contentTypeExtension === 'ppt' ||
    contentTypeExtension === 'potx' ||
    contentTypeExtension === 'pot' ||
    contentTypeExtension === 'vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return <FilePpt className={className} />;

  if (contentTypeExtension === 'csv') return <FileCsv className={className} />;

  if (contentTypeExtension === 'zip') return <FileZip className={className} />;

  if (contentTypeExtension === 'mp3' || contentType === 'audio/mpeg')
    return <FileMp3 className={className} />;

  if (contentTypeExtension === 'json' || contentType === 'xml')
    return <FileIcon className={className} />;

  console.log('contentTypeExtension', contentTypeExtension);

  return (
    <div
      className={`${className || ''} aspect-square flex flex-col items-center justify-center bg-indigo-200 text-[0.7rem] uppercase dark:bg-indigo-800 break-all overflow-hidden`}
    >
      {contentTypeExtension}
    </div>
  );
};
