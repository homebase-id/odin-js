import { OdinVideo, OdinVideoProps } from '@youfoundation/ui-lib';
import useAuth from '../../hooks/auth/useAuth';

export type VideoProps = Omit<OdinVideoProps, 'dotYouClient'>;

const Video = (props: VideoProps) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return <OdinVideo dotYouClient={dotYouClient} {...props} />;
};

export default Video;
