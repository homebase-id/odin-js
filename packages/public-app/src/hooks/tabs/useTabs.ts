import { t } from '@youfoundation/common-app';
import useAuth from '../auth/useAuth';
import useTheme from '../theme/useTheme';

const useTabs = () => {
  const { isAuthenticated } = useAuth();
  const { isTabs, tabsOrder } = useTheme();

  let tabsArray = tabsOrder.map((tab) => {
    return {
      key: tab.toLowerCase(),
      title: t(tab),
    };
  });

  if (!isAuthenticated) {
    tabsArray = tabsArray.filter((tab) => tab.key !== 'connections');
  }

  return {
    isTabs,
    tabs: [...tabsArray],
  };
};

export default useTabs;
