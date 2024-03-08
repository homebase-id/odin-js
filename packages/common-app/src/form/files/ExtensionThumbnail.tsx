export const ExtensionThumbnail = ({
  contentType,
  className,
}: {
  contentType: string;
  className?: string;
}) => {
  const contentTypeExtension = contentType.split('/')[1];

  return (
    <div className="aspect-square flex flex-col items-center justify-center bg-indigo-200 text-[0.7rem] uppercase dark:bg-indigo-800 ">
      {contentTypeExtension}
    </div>
  );
};
