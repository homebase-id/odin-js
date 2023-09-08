import { useSiteData } from '@youfoundation/common-app';
import { HomePageTheme } from '@youfoundation/js-lib/public';

interface TemplateSettings {
  themeId: HomePageTheme;
  isTabs: boolean;
  tabsOrder: string[];
  colors: { light: Record<string, string>; dark: Record<string, string> };
  favicon?: { fileId: string } | { emoji: string } | undefined;
}

const isRecord = (obj: unknown): obj is Record<string, unknown> => {
  if (!obj || typeof obj !== 'object' || !('themeId' in obj)) {
    return false;
  }

  return true;
};

const DEFAULT_SETTINGS: TemplateSettings = {
  themeId: HomePageTheme.SocialClassic,
  isTabs: true,
  tabsOrder: ['Posts', 'Links', 'About', 'Connections'],
  colors: {
    light: {
      'page-background': '246 248 250',
      background: '255 255 255',
      foreground: '11 11 11',
      button: '99 101 241',
      'button-text': '255 255 255',
    },
    dark: {
      'page-background': '17 24 39',
      background: '0 0 0',
      foreground: '250 250 250',
      button: '99 101 141',
      'button-text': '255 255 255',
    },
  },
};

const useTheme = () => {
  const { home } = useSiteData().data ?? {};
  const templateSettings = home?.templateSettings;

  if (!isRecord(templateSettings)) {
    return DEFAULT_SETTINGS;
  }

  const themeId = parseInt(templateSettings.themeId + '') ?? DEFAULT_SETTINGS.themeId;
  const isTabs =
    templateSettings.tabs === undefined ? DEFAULT_SETTINGS.isTabs : templateSettings.tabs == 'true';
  const tabsOrder = templateSettings.tabsOrder || DEFAULT_SETTINGS.tabsOrder;
  const colors =
    typeof templateSettings.colors === 'object' &&
    'light' in (templateSettings.colors as Record<string, unknown>) &&
    'dark' in (templateSettings.colors as Record<string, unknown>)
      ? templateSettings.colors
      : DEFAULT_SETTINGS.colors;
  const favicon = templateSettings.favicon;

  return { themeId, isTabs, tabsOrder, colors, favicon } as TemplateSettings;
};

export default useTheme;
