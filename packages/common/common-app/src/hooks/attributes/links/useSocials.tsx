import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BuiltInAttributes,
  BuiltInProfiles,
  getProfileAttributes,
  getSocialLink,
  SocialFields,
} from '@homebase-id/js-lib/profile';
import { getProfileAttributesOverPeer } from '@homebase-id/js-lib/peer';
import { useOdinClientContext } from '../../auth/useOdinClientContext';
import { FC, ReactNode } from 'react';
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
import { GetFile } from '@homebase-id/js-lib/public';

export type LinkType = {
  icon: FC<IconProps>;
  link: string;
  copyText?: string;
  priority: number;
  children: ReactNode;
};

export const useSocials = (props?: { odinId: string } | undefined) => {
  const { odinId } = props || {};

  const odinClient = useOdinClientContext();
  const isAuthenticated = !!odinClient.getHostIdentity();
  const queryClient = useQueryClient();

  const fetchData: (odinId?: string) => Promise<LinkType[] | undefined> = async () => {
    const parseSocialData = (
      socialData: { type: string; username: string; priority: number } | null
    ) => {
      if (!socialData) return null;
      const link = getSocialLink(socialData.type, socialData.username);
      return {
        icon: getLinkIcon(socialData.type),
        link: link || '',
        copyText: link ? undefined : socialData.username,
        priority: socialData.priority,
        children: link ? (
          socialData.username
        ) : (
          <>
            @{socialData.username} <small className="my-auto ml-1">({socialData.type})</small>
          </>
        ),
      };
    };

    const fetchStaticData = async () => {
      if (odinId) return null;

      const fileData = await GetFile(odinClient, 'sitedata.json');
      if (fileData.has('socials')) {
        const fileBasedResponse = (
          fileData
            .get('socials')
            ?.sort((a, b) => (a?.payload?.priority ?? 0) - (b?.payload?.priority ?? 0))
            ?.map((entry) => {
              if (!entry.payload?.data) return null;
              const value = Object.values(entry.payload?.data)?.[0];

              return {
                type: Object.keys(entry.payload?.data)?.[0],
                username: typeof value === 'string' ? value : '',
                priority: entry.payload?.priority,
              };
            })
            ?.map(parseSocialData)
            ?.filter(Boolean) as LinkType[] | undefined
        )?.sort((attrA, attrB) => attrA.priority - attrB.priority);

        if (fileBasedResponse?.length) return fileBasedResponse;
      }
    };

    const fetchDynamicData = async () => {
      try {
        const socialAttributes = odinId
          ? await getProfileAttributesOverPeer(odinClient, odinId, [
              ...BuiltInAttributes.AllSocial,
              ...BuiltInAttributes.AllGames,
            ])
          : await getProfileAttributes(odinClient, BuiltInProfiles.StandardProfileId, undefined, [
              ...BuiltInAttributes.AllSocial,
              ...BuiltInAttributes.AllGames,
            ]);

        return (
          socialAttributes
            ?.map((dsr) => {
              const attr = dsr.fileMetadata.appData.content;
              const value = Object.values(attr?.data || {})?.[0];

              return {
                type: Object.keys(attr?.data || {})?.[0],
                username: typeof value === 'string' ? value : '',
                priority: attr?.priority,
              };
            })
            .map(parseSocialData)
            ?.filter(Boolean) as LinkType[] | undefined
        )?.sort((attrA, attrB) => attrA.priority - attrB.priority);
      } catch (e) {
        console.error('failed to fetch dynamic data', e);
      }
    };

    const returnData = (await fetchStaticData()) ?? (await fetchDynamicData());

    if (isAuthenticated) {
      // We are authenticated, so we might have more data when fetching non-static data; Let's do so async with timeout to allow other static info to load and render
      setTimeout(async () => {
        const dynamicData = await fetchDynamicData();
        if (dynamicData) queryClient.setQueryData(['socials', odinId || ''], dynamicData);
      }, 500);
    }

    return returnData;
  };

  return useQuery({
    queryKey: ['socials', odinId || ''],
    queryFn: () => fetchData(odinId),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
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
