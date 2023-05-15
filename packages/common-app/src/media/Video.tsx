import { OdinVideo, OdinVideoProps } from '@youfoundation/ui-lib';
import { useDotYouClient } from '../..';

export type VideoProps = Omit<OdinVideoProps, 'dotYouClient'>;

export const Video = (props: VideoProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  return <OdinVideo dotYouClient={dotYouClient} {...props} />;
};
