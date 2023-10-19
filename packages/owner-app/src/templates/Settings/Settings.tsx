import { t } from '@youfoundation/common-app';
import { Cog } from '@youfoundation/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import Submenu from '../../components/SubMenu/SubMenu';
import { useParams } from 'react-router-dom';

import { NetworkVisibilitySettings } from './NetworkVisibilitySettings';
import { ReactionSettings } from './ReactionSettings';
import { SecuritySettings } from './SecuritySettings';

const Settings = () => {
  const { sectionId } = useParams();
  return (
    <>
      <PageMeta icon={Cog} title={`${t('Settings')}`} />
      <Submenu
        items={[
          {
            title: `Visibility of your network`,
            path: `/owner/settings/privacy`,
          },
          {
            title: `Ability to react on your public posts`,
            path: `/owner/settings/reactions`,
          },
          {
            title: `Security`,
            path: `/owner/settings/security`,
          },
        ]}
        className="-mt-6 mb-4"
      />
      {(sectionId === 'privacy' || !sectionId) && <NetworkVisibilitySettings />}
      {sectionId === 'reactions' && <ReactionSettings />}
      {sectionId === 'security' && <SecuritySettings />}
    </>
  );
};

export default Settings;
