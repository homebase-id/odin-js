import { OdinImageProps, OdinImage } from '@homebase-id/ui-lib';
import { useOdinClientContext } from '../hooks';

export type ImageProps = Omit<OdinImageProps, 'odinClient'>;

export const Image = (props: ImageProps) => {
  const odinClient = useOdinClientContext();

  return <OdinImage odinClient={odinClient} {...props} />;
};
