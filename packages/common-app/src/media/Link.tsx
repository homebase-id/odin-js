import { getHostFromUrl, tryJsonParse } from '@youfoundation/js-lib/helpers';
import { LinkPreview, LinkPreviewDescriptor } from '@youfoundation/js-lib/media';
import { ellipsisAtMaxChar } from '../helpers';
import { useQuery } from '@tanstack/react-query';
import { getPayloadAsJson, PayloadDescriptor, TargetDrive } from '@youfoundation/js-lib/core';
import { useDotYouClient } from '../hooks';
import { LoadingBlock } from '../ui';

export const LinkPreviewTextual = ({
  linkPreview,
  size,
  className,
}: {
  linkPreview?: LinkPreview;
  size?: 'sm' | 'md';
  className?: string;
}) => {
  return (
    <a
      className={`block group w-full ${className || ''}`}
      href={linkPreview?.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="">
        {linkPreview ? (
          <>
            <p className="capitalize font-bold">{getHostFromUrl(linkPreview.url)}</p>
            <p
              className={`text-sm text-primary group-hover:underline ${size === 'sm' ? 'max-h-[1.3rem] overflow-hidden' : ''}`}
            >
              {ellipsisAtMaxChar(linkPreview.title || linkPreview.url, size !== 'sm' ? 120 : 40)}
            </p>

            {size !== 'sm' ? (
              <p className="text-sm">{ellipsisAtMaxChar(linkPreview.description, 140)}</p>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <LoadingBlock className="w-full max-w-[5rem] h-8" />
            <LoadingBlock className="w-full h-6" />
            {size !== 'sm' ? <LoadingBlock className="w-full h-12" /> : null}
          </div>
        )}
      </div>
    </a>
  );
};

export const LinkPreviewImage = ({
  linkPreview,
  width,
  height,
  className,
}: {
  linkPreview?: LinkPreview;
  width?: number;
  height?: number;
  className?: string;
}) => {
  const aspectRatio =
    width && height
      ? width / height
      : linkPreview?.imageWidth && linkPreview.imageHeight
        ? linkPreview?.imageWidth / linkPreview.imageHeight
        : undefined;

  if (!linkPreview)
    return (
      <LoadingBlock
        className="w-full aspect-video"
        style={
          aspectRatio
            ? {
                aspectRatio: `${aspectRatio}`,
              }
            : undefined
        }
      />
    );
  if (!linkPreview.imageUrl) return null;

  return (
    <a href={linkPreview?.url} target="_blank" rel="noopener noreferrer">
      <img
        src={linkPreview.imageUrl}
        width={linkPreview.imageWidth}
        height={linkPreview.imageHeight}
        alt={linkPreview.url}
        className={className}
        style={
          aspectRatio
            ? {
                aspectRatio: `${aspectRatio}`,
              }
            : undefined
        }
      />
    </a>
  );
};

export const LinkPreviewItem = ({
  targetDrive,
  fileId,
  payload,
  className,
}: {
  targetDrive: TargetDrive;
  fileId: string;
  payload: PayloadDescriptor;
  className?: string;
}) => {
  const { data: linkMetadata, isLoading: linkMetadataLoading } = useLinkMetadata({
    fileId,
    payloadKey: payload.key,
    targetDrive,
  });

  const descriptorInfo = payload.descriptorContent
    ? tryJsonParse<LinkPreviewDescriptor[]>(payload.descriptorContent)?.[0]
    : undefined;

  // ATM We only use the first one
  const linkPreview = linkMetadata?.[0];
  if (!linkPreview && !linkMetadataLoading) return null;

  return (
    <div
      className={`rounded-t-lg overflow-hidden ${className || ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <LinkPreviewTextual linkPreview={linkPreview} className={`rounded-t-md  p-2 bg-primary/10`} />
      {descriptorInfo?.hasImage ? (
        <LinkPreviewImage
          linkPreview={linkPreview}
          className="w-full"
          width={descriptorInfo.imageWidth}
          height={descriptorInfo.imageHeight}
        />
      ) : null}
    </div>
  );
};

export const useLinkMetadata = ({
  targetDrive,
  fileId,
  payloadKey,
}: {
  targetDrive: TargetDrive;
  fileId: string;
  payloadKey: string;
}) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  return useQuery({
    queryKey: ['link-metadata', targetDrive.alias, fileId, payloadKey],
    queryFn: async () =>
      getPayloadAsJson<LinkPreview[]>(dotYouClient, targetDrive, fileId, payloadKey),
  });
};
