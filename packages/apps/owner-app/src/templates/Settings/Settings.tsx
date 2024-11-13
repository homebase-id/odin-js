import { t } from '@homebase-id/common-app';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import Submenu from '../../components/SubMenu/SubMenu';
import { useParams } from 'react-router-dom';

import { NetworkVisibilitySettings } from './NetworkVisibilitySettings';
import { ReactionSettings } from './ReactionSettings';
import { SecuritySettings } from './SecuritySettings';
import { IntroductionSettings } from './IntroductionSettings';
import { DeleteAccountSettings } from './DeleteAccountSettings';
import { Cog } from '@homebase-id/common-app/icons';

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
            title: `Introductions`,
            path: `/owner/settings/introductions`,
          },
          {
            title: `Security`,
            path: `/owner/settings/security`,
          },
          {
            title: `Delete account`,
            path: `/owner/settings/delete`,
          },
          // {
          //   title: `UI`,
          //   path: `/owner/settings/ui`,
          // },
        ]}
        className="-mt-6 mb-4"
      />
      {(sectionId === 'privacy' || !sectionId) && <NetworkVisibilitySettings />}
      {sectionId === 'reactions' && <ReactionSettings />}
      {sectionId === 'security' && <SecuritySettings />}
      {sectionId === 'introductions' && <IntroductionSettings />}
      {sectionId === 'delete' && <DeleteAccountSettings />}
      {/* {sectionId === 'ui' && <UiSettings />} */}
    </>
  );
};

export default Settings;
