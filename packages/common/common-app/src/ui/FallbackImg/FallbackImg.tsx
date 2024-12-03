import { Attribute } from '@homebase-id/js-lib/profile';
import { getOdinIdColor } from '../../helpers';
import { getInitialsOfNameAttribute, getTwoLettersFromDomain } from '@homebase-id/js-lib/helpers';
import { fallbackProfileImage } from './FallbackHelpers';

const getInitials = (
  domain: string | undefined,
  nameData?:
    | Attribute
    | {
        displayName?: string | undefined;
        givenName?: string | undefined;
        surname?: string | undefined;
      }
) => {
  if (nameData && 'id' in nameData) {
    return getInitialsOfNameAttribute(nameData);
  }

  if (nameData?.displayName) {
    return nameData.displayName
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('');
  }

  if (nameData?.givenName || nameData?.surname) {
    return ((nameData.givenName?.[0] ?? '') + (nameData.surname?.[0] ?? '') + '') as string;
  }

  return domain ? getTwoLettersFromDomain(domain) : '';
};

export const FallbackImg = ({
  odinId,
  nameData,
  className,
}: {
  odinId: string | undefined;
  nameData?:
    | Attribute
    | {
        displayName?: string | undefined;
        givenName?: string | undefined;
        surname?: string | undefined;
      };
  className?: string;
}) => {
  const backgroundColor = odinId ? getOdinIdColor(odinId).lightTheme : '#000000';
  const initials = getInitials(odinId, nameData);
  const fallbackSvg = `data:image/svg+xml;base64,${fallbackProfileImage(initials, backgroundColor)}`;

  return (
    <img
      src={fallbackSvg}
      className={`${className?.includes('h-') ? '' : 'h-full'} ${className?.includes('w-') ? '' : 'w-full'}`}
    />
  );
};
