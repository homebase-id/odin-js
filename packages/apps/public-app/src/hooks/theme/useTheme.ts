import { useSiteData } from '@homebase-id/common-app';
import { HomePageTheme } from '@homebase-id/js-lib/public';

interface SiteColors {
  id: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

interface TemplateSettings {
  themeId: HomePageTheme;
  isTabs: boolean;
  tabsOrder: string[];
  colors?: SiteColors;
  imageFileId?: string;
  favicon?: { fileKey: string } | { emoji: string } | undefined;
}

const isRecord = (obj: unknown): obj is Record<string, unknown> => {
  if (!obj || typeof obj !== 'object' || !('themeId' in obj)) {
    return false;
  }

  return true;
};

const DEFAULT_SETTINGS: TemplateSettings = {
  themeId: HomePageTheme.VerticalPosts,
  isTabs: true,
  tabsOrder: ['Posts', 'Links', 'About', 'Connections'],
};

export const useTheme = () => {
  const { home } = useSiteData().data ?? {};
  const templateSettings = home?.templateSettings;

  if (!isRecord(templateSettings)) {
    return DEFAULT_SETTINGS;
  }

  const themeId = parseInt(templateSettings.themeId + '') ?? DEFAULT_SETTINGS.themeId;
  const isTabs =
    templateSettings.tabs === undefined ? DEFAULT_SETTINGS.isTabs : templateSettings.tabs == 'true';
  const tabsOrder = templateSettings.tabsOrder || DEFAULT_SETTINGS.tabsOrder;
  // The "Default" set means no custom colours: the site keeps the theme file's
  const colors =
    typeof templateSettings.colors === 'object' &&
    'light' in (templateSettings.colors as Record<string, unknown>) &&
    'dark' in (templateSettings.colors as Record<string, unknown>) &&
    (templateSettings.colors as SiteColors).id !== 'default'
      ? templateSettings.colors
      : undefined;
  const favicon = templateSettings.favicon;
  const imageFileId = templateSettings.imageFileId;

  return { themeId, isTabs, tabsOrder, colors, imageFileId, favicon } as TemplateSettings;
};
