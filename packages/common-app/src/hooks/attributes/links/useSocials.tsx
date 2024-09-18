import { useQuery } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  getProfileAttributes,
  SocialFields,
} from '@homebase-id/js-lib/profile';
import { getProfileAttributesOverPeer } from '@homebase-id/js-lib/peer';
import { useDotYouClientContext } from '../../auth/useDotYouClientContext';
import { FC, ReactNode } from 'react';
import { UNLINKABLE_SOCIALS } from '../../../../../public-app/src/components/ui/Layout/Links/Links';
import {
  IconProps,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Tiktok,
  Person,
  Minecraft,
  Steam,
  Discord,
  Snapchat,
  Youtube,
  RiotGames,
  EpicGames,
  Github,
  Stackoverflow,
  Globe,
} from '../../../ui/Icons';

export type LinkType = {
  icon: FC<IconProps>;
  link: string;
  copyText?: string;
  priority?: number;
  children: ReactNode;
};

export const useSocials = (props?: { odinId: string } | undefined) => {
  const { odinId } = props || {};

  const dotYouClient = useDotYouClientContext();

  const fetchData: (odinId?: string) => Promise<LinkType[] | undefined> = async () => {
    console.log('fetching socials', odinId);

    const fetchStaticData = async () => {
      if (odinId) return null;

      //   const fileData = await GetFile(dotYouClient, 'sitedata.json');
      //   if (fileData.has('link')) {
      //     const socialAttributes = (
      //       fileData
      //         .get('link')
      //         ?.map((entry) => {
      //           const attribute = entry.payload as Attribute;
      //           if (!attribute.data) return undefined;

      //           return {
      //             text: attribute.data[LinkFields.LinkText] as string,
      //             target: attribute.data[LinkFields.LinkTarget] as string,
      //             id: attribute.id,
      //             priority: attribute.priority,
      //           };
      //         })
      //         .filter(Boolean) as LinkType[]
      //     ).sort((attrA, attrB) => attrB.priority - attrA.priority);

      //     return socialAttributes;
      //   }
    };

    const fetchDynamicData = async () => {
      try {
        const socialAttributes = odinId
          ? await getProfileAttributesOverPeer(dotYouClient, odinId, [
              ...BuiltInAttributes.AllSocial,
              ...BuiltInAttributes.AllGames,
            ])
          : await getProfileAttributes(dotYouClient, BuiltInProfiles.StandardProfileId, undefined, [
              ...BuiltInAttributes.AllSocial,
              ...BuiltInAttributes.AllGames,
            ]);

        console.log('socialAttributes', socialAttributes);

        return socialAttributes
          ?.map((dsr) => {
            const attr = dsr.fileMetadata.appData.content;
            const value = Object.values(attr?.data || {})?.[0];

            return {
              type: Object.keys(attr?.data || {})?.[0],
              username: typeof value === 'string' ? value : '',
              priority: attr?.priority,
            };
          })
          .map((social) => {
            const link = getLink(social.type, social.username);
            return {
              icon: getLinkIcon(social.type),
              link: link,
              copyText: link ? undefined : social.username,
              priority: social.priority,
              children: link ? (
                social.username
              ) : (
                <>
                  @{social.username} <small className="my-auto ml-1">({social.type})</small>
                </>
              ),
            };
          })
          .sort((attrA, attrB) => attrA.priority - attrB.priority);
      } catch (e) {
        console.error('failed to fetch dynamic data', e);
      }
    };

    const returnData = (await fetchStaticData()) ?? (await fetchDynamicData());

    // if (isAuthenticated) {
    //   // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
    //   setTimeout(async () => {
    //     const dynamicData = await fetchDynamicData();
    //     if (dynamicData) {
    //       queryClient.setQueryData(['links'], dynamicData);
    //     }
    //   }, 500);
    // }

    return returnData;
  };

  return useQuery({
    queryKey: ['socials', odinId || ''],
    queryFn: () => fetchData(odinId),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
};

export const getLinkIcon = (type: string): React.FC<IconProps> => {
  switch (type) {
    case SocialFields.Facebook:
      return Facebook;
    case SocialFields.Twitter:
      return Twitter;
    case SocialFields.LinkedIn:
      return Linkedin;
    case SocialFields.Instagram:
      return Instagram;
    case SocialFields.Tiktok:
      return Tiktok;
    case SocialFields.Homebase:
      return Person;
    case 'minecraft':
      return Minecraft;
    case 'steam':
      return Steam;
    case 'discord':
      return Discord;
    case 'snapchat':
      return Snapchat;
    case 'youtube':
      return Youtube;
    case 'riot games':
      return RiotGames;
    case 'epic games':
      return EpicGames;
    case 'github':
      return Github;
    case 'stackoverflow':
      return Stackoverflow;
    default:
      return Globe;
  }
};
export const getLink = (type: string, username: string): string => {
  if (UNLINKABLE_SOCIALS.includes(type)) return '';

  return type !== 'dotyouid'
    ? `https://${type}.com/${
        type === SocialFields.LinkedIn ? 'in/' : type === SocialFields.Snapchat ? 'add/' : ''
      }${username}`
    : `https://${username}`;
};
