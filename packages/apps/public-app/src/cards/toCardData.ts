import { toSocialLink } from '@homebase-id/common-app';
import {
  cardSocials,
  type CardAudience,
  type CardData,
  type CardLink,
  type CardPhoto,
  type CardPost,
} from './useCardData';
import { LOADED_POSTS } from './parts/posts';

export type AppImage = { src: string };
export type AppData = {
  odinId: string;
  firstName?: string;
  surName?: string;
  displayName?: string;
  headline?: string;
  bio?: string;
  photo?: AppImage;
  header?: AppImage;
  links?: CardLink[];
  socials?: { type: string; username: string }[];
  posts?: (Omit<CardPost, 'image'> & { image?: AppImage })[];
};
export const toAudience = (audience: CardAudience | undefined): CardAudience | undefined =>
  audience?.kind === 'public' || audience?.kind === 'circle'
    ? { kind: audience.kind, label: audience.label }
    : undefined;

export const toCardData = (
  data: AppData,
  dropped: (reason: string) => void,
  audience?: CardAudience
): CardData => {
  if (!data?.odinId) throw new Error('data.odinId is required');
  const image = (value: AppImage | undefined, field: string): CardPhoto | undefined => {
    if (!value?.src) return undefined;
    if (/^(data|blob):/i.test(value.src)) return { src: value.src };
    dropped(`${field}.src is not a data: URL, dropped`);
    return undefined;
  };
  return {
    odinId: data.odinId,
    firstName: data.firstName,
    surName: data.surName,
    displayName: data.displayName,
    headline: data.headline,
    bio: data.bio,
    photo: image(data.photo, 'photo'),
    header: image(data.header, 'header'),
    links: data.links ?? [],
    socials: cardSocials(
      (data.socials ?? []).map((social, priority) => toSocialLink({ ...social, priority }))
    ),
    posts: (data.posts ?? [])
      .slice(0, LOADED_POSTS)
      .map((post, index) => ({ ...post, image: image(post.image, `posts[${index}].image`) })),
    audience: toAudience(audience),
  };
};
