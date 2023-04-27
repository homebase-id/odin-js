import { OdinImageProps, OdinImage } from '@youfoundation/ui-lib';
import useAuth from '../../hooks/auth/useAuth';

export type ImageProps = Omit<OdinImageProps, 'dotYouClient'>;

const Image = (props: ImageProps) => {
  const { getDotYouClient } = useAuth();
  const dotYouClient = getDotYouClient();

  return <OdinImage dotYouClient={dotYouClient} {...props} />;
};

export default Image;
