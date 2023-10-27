import { t } from '@youfoundation/common-app';
import { useTheme } from '../theme/useTheme';

export const useTabs = () => {
  const { isTabs, tabsOrder } = useTheme();

  const tabsArray = tabsOrder.map((tab) => {
    return {
      key: tab.toLowerCase(),
      title: t(tab),
    };
  });

  return {
    isTabs,
    tabs: [...tabsArray],
  };
};
