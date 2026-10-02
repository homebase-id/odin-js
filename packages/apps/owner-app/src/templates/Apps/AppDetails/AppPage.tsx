import { useParams } from 'react-router-dom';
import AppDetails from './AppDetails';
import OwnerConsoleAppDetails from './OwnerConsoleAppDetails';
import { isOwnerConsoleApp } from '../../../hooks/apps/useOwnerAppName';

/**
 * /owner/third-parties/apps/:appKey. The owner console has its own page there: it owns drives and
 * circles like an app does, but is not a registered app, so the app page has nothing to load for it.
 * Chosen here rather than inside AppDetails, so that page's hooks never see an app that is not there.
 */
const AppPage = () => {
  const { appKey } = useParams();
  return appKey && isOwnerConsoleApp(decodeURIComponent(appKey)) ? (
    <OwnerConsoleAppDetails />
  ) : (
    <AppDetails />
  );
};

export default AppPage;
