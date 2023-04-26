import { t } from '../../helpers/i18n/dictionary';
import useSettings from '../../hooks/settings/useSettings';
import ErrorNotification from '../../components/ui/Alerts/ErrorNotification/ErrorNotification';
import Checkbox from '../../components/Form/Checkbox';
import Label from '../../components/Form/Label';
import Cog from '../../components/ui/Icons/Cog/Cog';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import Section from '../../components/ui/Sections/Section';

const Settings = () => {
  const {
    fetchFlags: { data: systemSettings, isLoading: systemSettingsLoading },
    updateFlag: { mutate: updateFlag, error: updateFlagError },
    fetchUiSettings: { data: uiSettings, isLoading: uiSettingsLoading },
    updateUiSetting: { mutate: updateUiSetting, error: updateUiSettingError },
  } = useSettings();

  return (
    <>
      <ErrorNotification error={updateFlagError} />
      <ErrorNotification error={updateUiSettingError} />
      <PageMeta icon={Cog} title={`${t('Settings')}`} />
      {systemSettings && !systemSettingsLoading && (
        <>
          <Section
            title={
              <div className="flex flex-col">
                {t('Who can view your connections?')}
                <small className="text-sm text-gray-400">
                  {t(
                    'People that are member of a circle that has access to view your connections will always be able to see your connections'
                  )}
                </small>
              </div>
            }
          >
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="anonymousVisitorsCanViewConnections"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Everyone')}
                <small className="text-sm text-gray-400">
                  {t('Everyone that visits your homepage will see an overview of your connections')}
                </small>
              </Label>
              <Checkbox
                className="ml-auto"
                name="anonymousVisitorsCanViewConnections"
                defaultChecked={systemSettings?.anonymousVisitorsCanViewConnections}
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="authenticatedIdentitiesCanViewConnections"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Authenticated')}
                <small className="text-sm text-gray-400">
                  {t(
                    'Authenticated people that visit your public site will see an overview of your connections'
                  )}
                </small>
              </Label>

              <Checkbox
                className="ml-auto"
                name="authenticatedIdentitiesCanViewConnections"
                defaultChecked={systemSettings?.authenticatedIdentitiesCanViewConnections}
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="ConnectedIdentitiesCanViewConnections"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Connected')}
                <small className="text-sm text-gray-400">
                  {t(
                    'Connected people that visit your public site will see an overview of your connections'
                  )}
                </small>
              </Label>
              <Checkbox
                className="ml-auto"
                name="ConnectedIdentitiesCanViewConnections"
                defaultChecked={systemSettings?.allConnectedIdentitiesCanViewConnections}
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
          </Section>
          <Section
            title={
              <div className="flex flex-col">
                {t('Who can view who you follow?')}
                <small className="text-sm text-gray-400">
                  {t(
                    'People that are member of a circle that has access to view who you follow will always be able to see who you follow'
                  )}
                </small>
              </div>
            }
          >
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="anonymousVisitorsCanViewWhoIFollow"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Everyone')}
                <small className="text-sm text-gray-400">
                  {t('Everyone that visits your homepage will see an overview of who you follow')}
                </small>
              </Label>
              <Checkbox
                className="ml-auto"
                name="anonymousVisitorsCanViewWhoIFollow"
                defaultChecked={systemSettings?.anonymousVisitorsCanViewWhoIFollow}
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="authenticatedIdentitiesCanViewWhoIFollow"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Authenticated')}
                <small className="text-sm text-gray-400">
                  {t(
                    'Authenticated people that visit your public site will see an overview of who you follow'
                  )}
                </small>
              </Label>

              <Checkbox
                className="ml-auto"
                name="authenticatedIdentitiesCanViewWhoIFollow"
                defaultChecked={systemSettings?.authenticatedIdentitiesCanViewWhoIFollow}
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="ConnectedIdentitiesCanViewWhoIFollow"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Connected')}
                <small className="text-sm text-gray-400">
                  {t(
                    'Connected people that visit your public site will see an overview of who you follow'
                  )}
                </small>
              </Label>
              <Checkbox
                className="ml-auto"
                name="ConnectedIdentitiesCanViewWhoIFollow"
                defaultChecked={systemSettings?.allConnectedIdentitiesCanViewWhoIFollow}
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
          </Section>
        </>
      )}
      {uiSettings && !uiSettingsLoading && (
        <Section title={t('Ui Settings')}>
          <div className="mb-5 flex flex-row">
            <Label htmlFor="name" className="my-auto mr-2 flex flex-col">
              {t('Automatically load the profile pictures of connection requests')}
              <small className="text-sm text-gray-400">
                {t(
                  'If enabled, connection requests will automatically load the corresponding profile picture if available. Otherwise you need to click to load the profile picture'
                )}
              </small>
            </Label>
            <Checkbox
              className="ml-auto"
              name="automaticallyLoadProfilePicture"
              defaultChecked={uiSettings?.automaticallyLoadProfilePicture}
              onChange={(e) => {
                const newUiSettings = { ...uiSettings };
                newUiSettings[e.target.name] = e.target.checked;

                updateUiSetting(newUiSettings);
              }}
            />
          </div>
        </Section>
      )}
    </>
  );
};

export default Settings;
