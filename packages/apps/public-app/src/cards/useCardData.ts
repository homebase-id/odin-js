import {
  BLOG_POST_INFIITE_PAGE_SIZE,
  flattenInfinteData,
  LinkType,
  ThemeCardSettings,
  useBiography,
  useLinks,
  usePostsInfinite,
  useSiteData,
  useSocials,
} from '@homebase-id/common-app';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { HomePageConfig, PostContent } from '@homebase-id/js-lib/public';
import { EmbeddedThumb, HomebaseFile, TargetDrive } from '@homebase-id/js-lib/core';

export type CardImage = {
  fileId?: string;
  fileKey?: string;
  lastModified?: number;
  previewThumbnail?: EmbeddedThumb;
  targetDrive: TargetDrive;
  probablyEncrypted?: boolean;
};
export type CardLink = { id: string; text: string; target: string };
export type CardData = {
  odinId: string;
  firstName?: string;
  surName?: string;
  displayName?: string;
  headline?: string;
  bio?: string;
  photo?: CardImage;
  header?: CardImage;
  links: CardLink[];
  socials: LinkType[];
  posts: HomebaseFile<PostContent>[];
};

// The Homebase id social points at this very site, so a card has no use for it
const isOwnSite = (link: string, odinId: string) => {
  try {
    return new URL(link).host === odinId;
  } catch {
    return false;
  }
};

export const useCardData = (): CardData | undefined => {
  const { data: siteData } = useSiteData();
  const { data: links } = useLinks();
  const { data: socials } = useSocials();
  const { data: biography } = useBiography();
  const { data: postPages } = usePostsInfinite({});

  if (!siteData) return undefined;
  const { owner, home } = siteData;
  const settings = home?.templateSettings as ThemeCardSettings | undefined;
  const odinId = window.location.hostname;

  return {
    odinId,
    firstName: owner?.firstName,
    surName: owner?.surName,
    displayName: owner?.displayName,
    headline: settings?.tagLine || owner?.status,
    bio: biography?.bioSummary?.body,
    photo: owner?.profileImageFileKey
      ? {
          fileId: owner.profileImageFileId,
          fileKey: owner.profileImageFileKey,
          lastModified: owner.profileImageLastModified,
          previewThumbnail: owner.profileImagePreviewThumbnail,
          targetDrive: GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId),
        }
      : undefined,
    header: settings?.headerImageKey
      ? {
          fileId: settings.imageFileId,
          fileKey: settings.headerImageKey,
          lastModified: settings.imageLastModified,
          previewThumbnail: home?.headerPreviewThumbnail,
          targetDrive: HomePageConfig.HomepageTargetDrive,
        }
      : undefined,
    links: (links ?? []).map(({ id, text, target }) => ({ id, text, target })),
    socials: (socials ?? []).filter((social) => social.link && !isOwnSite(social.link, odinId)),
    posts: flattenInfinteData<HomebaseFile<PostContent>>(postPages, BLOG_POST_INFIITE_PAGE_SIZE).slice(0, 12),
  };
};
