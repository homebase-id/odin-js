import { OdinImageProps, OdinImage } from '@homebase-id/ui-lib';
import { useDotYouClient } from '../hooks/auth/useDotYouClient';

export type ImageProps = Omit<OdinImageProps, 'dotYouClient'>;

export const Image = (props: ImageProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  return <OdinImage dotYouClient={dotYouClient} {...props} />;
};
