import { getHostFromUrl, tryJsonParse } from '@homebase-id/js-lib/helpers';
import { LinkPreview, LinkPreviewDescriptor } from '@homebase-id/js-lib/media';
import { ellipsisAtMaxChar } from '../helpers';
import {
  EmbeddedThumb,
  PayloadDescriptor,
  SystemFileType,
  TargetDrive,
} from '@homebase-id/js-lib/core';
import { useLinkMetadata } from '../hooks';
import { LoadingBlock } from '../ui';
import { useMemo } from 'react';

export const LinkPreviewTextual = ({
  linkPreview,
  descriptor,
  size,
  className,
}: {
  linkPreview?: LinkPreview | undefined;
  descriptor?: LinkPreviewDescriptor;
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
        <>
          <p className="capitalize font-bold">
            {getHostFromUrl(descriptor?.url || linkPreview?.url)}
          </p>
          <p
            className={`text-sm text-primary group-hover:underline ${
              size === 'sm' ? 'max-h-[1.3rem] overflow-hidden' : ''
            }`}
          >
            {ellipsisAtMaxChar(
              descriptor?.title || linkPreview?.title || linkPreview?.url || descriptor?.url || '',
              size !== 'sm' ? 120 : 40
            )}
          </p>

          {size !== 'sm' ? (
            <p className="text-sm">
              {ellipsisAtMaxChar(linkPreview?.description || descriptor?.description, 140)}
            </p>
          ) : null}
        </>

        {/* // (
        //   <div className="flex flex-col gap-1">
        //     <LoadingBlock className="w-full max-w-[5rem] h-8" />
        //     <LoadingBlock className="w-full h-6" />
        //     {size !== 'sm' ? <LoadingBlock className="w-full h-12" /> : null}
        //   </div>
        // )} */}
      </div>
    </a>
  );
};

export const LinkPreviewImage = ({
  linkPreview,
  width,
  height,
  className,
  previewThumbnail,
  onLoad,
}: {
  linkPreview?: LinkPreview;
  width?: number;
  height?: number;
  className?: string;
  previewThumbnail?: EmbeddedThumb;
  onLoad?: () => void;
}) => {
  const aspectRatio =
    width && height
      ? width / height
      : linkPreview?.imageWidth && linkPreview.imageHeight
        ? linkPreview?.imageWidth / linkPreview.imageHeight
        : undefined;

  const embeddedThumbUrl = useMemo(
    () =>
      previewThumbnail && `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`,
    [previewThumbnail]
  );

  if (!linkPreview) {
    if (previewThumbnail) {
      return (
        <img
          src={embeddedThumbUrl}
          className={`${className} blur-sm`}
          style={
            aspectRatio
              ? {
                  aspectRatio: `${aspectRatio}`,
                }
              : undefined
          }
        />
      );
    } else {
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
    }
  }
  if (!linkPreview.imageUrl) return null;

  return (
    <a href={linkPreview?.url} target="_blank" rel="noopener noreferrer">
      <img
        src={linkPreview.imageUrl}
        width={linkPreview.imageWidth}
        height={linkPreview.imageHeight}
        alt={linkPreview.url}
        className={className}
        onLoad={onLoad}
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
  odinId,
  globalTransitId,
  systemFileType,
  fileId,
  payload,
  className,
  onLoad,
}: {
  targetDrive: TargetDrive;
  odinId?: string;
  fileId: string | undefined;
  globalTransitId?: string | undefined;
  systemFileType?: SystemFileType;
  payload: PayloadDescriptor;
  className?: string;
  onLoad?: () => void;
}) => {
  const { data: linkMetadata } = useLinkMetadata({
    odinId,
    globalTransitId,
    fileId,
    payloadKey: payload.key,
    targetDrive,
    systemFileType,
  });

  const descriptorInfo = payload.descriptorContent
    ? tryJsonParse<LinkPreviewDescriptor[]>(payload.descriptorContent)?.[0]
    : undefined;

  // ATM We only use the first one
  const linkPreview = linkMetadata?.[0];
  // if (!linkPreview && !linkMetadataLoading) return null;

  return (
    <div
      className={`rounded-t-lg overflow-hidden ${className || ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <LinkPreviewTextual
        linkPreview={linkPreview}
        descriptor={descriptorInfo}
        className={`rounded-t-md break-words p-2 bg-primary/10`}
      />
      {descriptorInfo?.hasImage ? (
        <LinkPreviewImage
          linkPreview={linkPreview}
          className="w-full"
          width={descriptorInfo.imageWidth}
          height={descriptorInfo.imageHeight}
          previewThumbnail={payload.previewThumbnail}
          onLoad={onLoad}
        />
      ) : null}
    </div>
  );
};
