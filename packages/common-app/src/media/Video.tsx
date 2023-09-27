import { OdinVideo, OdinVideoProps } from '@youfoundation/ui-lib';
import { useDotYouClient } from '../..';
import { EmbeddedThumb } from '@youfoundation/js-lib/core';
import { useMemo } from 'react';

export interface VideoProps extends Omit<OdinVideoProps, 'dotYouClient'> {
  previewThumbnail?: EmbeddedThumb;
}

export const Video = ({ previewThumbnail, ...props }: VideoProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  const poster = useMemo(() => {
    if (!previewThumbnail || !!props.poster) return undefined;
    return `data:${previewThumbnail.contentType};base64,${previewThumbnail.content}`;
  }, [previewThumbnail]);

  return <OdinVideo dotYouClient={dotYouClient} poster={poster || props.poster} {...props} />;
};
