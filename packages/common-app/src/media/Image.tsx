import { OdinImageProps, OdinImage } from '@youfoundation/ui-lib';
import { useDotYouClient } from '../..';

export type ImageProps = Omit<OdinImageProps, 'dotYouClient'>;

export const Image = (props: ImageProps) => {
  const dotYouClient = useDotYouClient().getDotYouClient();

  return <OdinImage dotYouClient={dotYouClient} {...props} />;
};
