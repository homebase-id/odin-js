import { HOME_ROOT_PATH, t } from '@homebase-id/common-app';
import { useTheme } from '../theme/useTheme';
import { useMatch } from 'react-router-dom';

export const useTabs = () => {
  const { isTabs, tabsOrder } = useTheme();

  const tabsArray = tabsOrder.map((tab) => {
    return {
      key: tab.toLowerCase(),
      title: t(tab),
    };
  });

  const tabMatch = useMatch({ path: `${HOME_ROOT_PATH}:tab` });

  return {
    isTabs,
    tabs: [...tabsArray],
    activeTab: tabMatch?.params.tab || 'posts',
  };
};
