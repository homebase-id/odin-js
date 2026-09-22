import {
  BLOG_POST_INFIITE_PAGE_SIZE,
  flattenInfinteData,
  LinkType,
  ThemeCoverSettings,
  ThemeLinksSettings,
  useBiography,
  useLinks,
  usePostsInfinite,
  useSiteData,
  useSocials,
} from '@homebase-id/common-app';
import {
  BuiltInProfiles,
  GetTargetDriveFromProfileId,
  SocialFields,
} from '@homebase-id/js-lib/profile';
import { HomePageConfig, PostContent } from '@homebase-id/js-lib/public';
import { EmbeddedThumb, HomebaseFile, TargetDrive } from '@homebase-id/js-lib/core';
import { cardPost, usePostHref } from './parts/posts';

export type CardImage = {
  fileId?: string;
  fileKey?: string;
  lastModified?: number;
  previewThumbnail?: EmbeddedThumb;
  targetDrive: TargetDrive;
  probablyEncrypted?: boolean;
};
// In app mode the app sends every image as a data URL; the page reads no drive
export type CardPhoto = CardImage | { src: string };
export type CardLink = { id: string; text: string; target: string };
export type CardPost = {
  id: string;
  href: string;
  date: number;
  title?: string;
  excerpt?: string;
  minutes?: number;
  image?: CardPhoto;
};
export type CardData = {
  odinId: string;
  firstName?: string;
  surName?: string;
  displayName?: string;
  headline?: string;
  bio?: string;
  photo?: CardPhoto;
  header?: CardPhoto;
  links: CardLink[];
  socials: LinkType[];
  posts: CardPost[];
};

// the Homebase id social points at this very site, so a card has no use for it
export const cardSocials = (socials: LinkType[]) =>
  socials.filter((social) => social.link && social.type !== SocialFields.Homebase);

export const ownerName = ({ firstName, surName, displayName, odinId }: CardData) =>
  [firstName, surName].filter(Boolean).join(' ') || displayName || odinId;

export const useCardData = (): CardData | undefined => {
  const { data: siteData } = useSiteData();
  const { data: links } = useLinks();
  const { data: socials } = useSocials();
  const { data: biography } = useBiography();
  const { data: postPages } = usePostsInfinite({});
  const postHref = usePostHref();

  if (!siteData) return undefined;
  const { owner, home } = siteData;
  // tagLine only exists on the Cover theme, headerImageKey on the tabs and Links themes
  const settings = home?.templateSettings as
    | (ThemeLinksSettings & Pick<ThemeCoverSettings, 'tagLine'>)
    | undefined;
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
    socials: cardSocials(socials ?? []),
    posts: flattenInfinteData<HomebaseFile<PostContent>>(postPages, BLOG_POST_INFIITE_PAGE_SIZE)
      .slice(0, 12)
      .map((post) => cardPost(post, postHref(post))),
  };
};
