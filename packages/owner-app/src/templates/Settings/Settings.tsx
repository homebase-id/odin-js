import { ActionButton, Alert, Input, t } from '@youfoundation/common-app';
import useSettings from '../../hooks/settings/useSettings';
import { ErrorNotification } from '@youfoundation/common-app';
import Checkbox from '../../components/Form/Checkbox';
import { Label } from '@youfoundation/common-app';
import { Cog } from '@youfoundation/common-app';
import Section from '../../components/ui/Sections/Section';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import Submenu from '../../components/SubMenu/SubMenu';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import useAuth from '../../hooks/auth/useAuth';

const Settings = () => {
  const { sectionId } = useParams();
  return (
    <>
      <PageMeta icon={Cog} title={`${t('Settings')}`} />
      <Submenu
        items={[
          {
            title: `Privacy`,
            path: `/owner/settings/privacy`,
          },
          {
            title: `Ui`,
            path: `/owner/settings/ui`,
          },
          {
            title: `Security`,
            path: `/owner/settings/security`,
          },
        ]}
        className="-mt-6 mb-4"
      />
      {(sectionId === 'privacy' || !sectionId) && <PrivacySettings />}
      {sectionId === 'ui' && <UiSettings />}
      {sectionId === 'security' && <SecuritySettings />}
    </>
  );
};

const PrivacySettings = () => {
  const {
    fetchFlags: { data: systemSettings, isLoading: systemSettingsLoading },
    updateFlag: { mutate: updateFlag, error: updateFlagError },
  } = useSettings();

  return (
    <>
      <ErrorNotification error={updateFlagError} />
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
          <Section
            title={
              <div className="flex flex-col">
                {t('Who can react on your public posts?')}
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
                htmlFor="authenticatedIdentitiesCanReactOnAnonymousDrives"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Authenticated')}
                <small className="text-sm text-gray-400">
                  {t(
                    'Every authenticated user will be able to react with an emoji to your public posts'
                  )}
                </small>
              </Label>
              <Checkbox
                className="ml-auto"
                name="authenticatedIdentitiesCanReactOnAnonymousDrives"
                defaultChecked={
                  systemSettings?.authenticatedIdentitiesCanReactOnAnonymousDrives ?? true
                }
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="connectedIdentitiesCanReactOnAnonymousDrives"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Connected')}
                <small className="text-sm text-gray-400">
                  {t(
                    'Every connected user will be able to react with an emoji to your public posts'
                  )}
                </small>
              </Label>

              <Checkbox
                className="ml-auto"
                name="connectedIdentitiesCanReactOnAnonymousDrives"
                defaultChecked={
                  systemSettings?.connectedIdentitiesCanReactOnAnonymousDrives ?? true
                }
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
            <div className="mb-5 flex flex-row">
              <Label
                htmlFor="connectedIdentitiesCanCommentOnAnonymousDrives"
                className="my-auto mr-2 flex flex-col"
              >
                {t('Connected')}
                <small className="text-sm text-gray-400">
                  {t('Every connected user will be able to comment on your public posts')}
                </small>
              </Label>
              <Checkbox
                className="ml-auto"
                name="connectedIdentitiesCanCommentOnAnonymousDrives"
                defaultChecked={
                  systemSettings?.connectedIdentitiesCanCommentOnAnonymousDrives ?? true
                }
                onChange={(e) => updateFlag({ name: e.target.name, value: e.target.checked })}
              />
            </div>
          </Section>
        </>
      )}
    </>
  );
};

const UiSettings = () => {
  const {
    fetchUiSettings: { data: uiSettings, isLoading: uiSettingsLoading },
    updateUiSetting: { mutate: updateUiSetting, error: updateUiSettingError },
  } = useSettings();

  return (
    <>
      <ErrorNotification error={updateUiSettingError} />

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

const SecuritySettings = () => {
  const [state, setState] = useState<'loading' | 'error' | 'success' | 'idle'>('idle');

  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');

  const { changePassword, getDotYouClient } = useAuth();

  const passwordIsValid = password === retypePassword && password !== '';

  const doSetNewPassword = async () => {
    setState('loading');

    if (await changePassword(getDotYouClient(), oldPassword, password)) {
      setState('success');
    } else {
      setState('error');
    }
  };

  return (
    <>
      <Section title={t('Change password')}>
        {state === 'success' ? (
          <p className="my-2">{t('Your password has been changed successfully')}</p>
        ) : state === 'error' ? (
          <>
            <Alert type="warning" isCompact={true}>
              {t('Failed to set a new password, check your old password and try again')}
            </Alert>
            <div className="mt-5 flex flex-row-reverse">
              <ActionButton onClick={() => setState('idle')}>{t('Try again')}</ActionButton>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              doSetNewPassword();
            }}
          >
            <div className="mb-2">
              <Label>{t('Your current password')}</Label>
              <Input
                required
                name="oldPassword"
                id="oldPassword"
                type="password"
                onChange={(e) => setOldPassword(e.target.value)}
                defaultValue={oldPassword}
                autoComplete="current-password"
              />
            </div>
            <hr className="mb-5 mt-7" />
            <div className="mb-2">
              <Label>{t('New password')}</Label>
              <Input
                required
                name="password"
                id="password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                defaultValue={password}
                autoComplete="new-password"
              />
            </div>
            <div className="mb-2">
              <Label htmlFor="retypepassword" className="text-sm leading-7  dark:text-gray-400">
                {t('Retype your new password')}
              </Label>
              <Input
                required
                type="password"
                name="retypePassword"
                id="retypePassword"
                onChange={(e) => setRetypePassword(e.target.value)}
                defaultValue={retypePassword}
                autoComplete="new-password"
              />
              {password !== retypePassword && retypePassword !== '' ? (
                <p className="py-2 text-red-800 dark:text-red-200">{t("Passwords don't match")}</p>
              ) : null}
            </div>
            <div className="mt-5 flex flex-row-reverse">
              <ActionButton state={state} isDisabled={!passwordIsValid}>
                {t('Change password')}
              </ActionButton>
            </div>
          </form>
        )}
      </Section>
    </>
  );
};

export default Settings;
