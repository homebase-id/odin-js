/* eslint-disable no-fallthrough */
import { ErrorNotification, t, Label } from '@youfoundation/common-app';
import RadioButton from '../../components/Form/RadioButton';
import Section from '../../components/ui/Sections/Section';
import { useSettings } from '../../hooks/settings/useSettings';

export const NetworkVisibilitySettings = () => {
  const {
    fetchFlags: { data: systemSettings, isLoading: systemSettingsLoading },
    updateFlag: { mutateAsync: updateFlag, error: updateFlagError },
  } = useSettings();

  const handleCanViewConnectionsChange: React.MouseEventHandler = async (e) => {
    let allowAnonymous = false;
    let allowAuthenticated = false;
    let allowConnected = false;

    switch (e.currentTarget.id) {
      case 'anonymousVisitorsCanViewConnections':
        allowAnonymous = true;
      case 'authenticatedIdentitiesCanViewConnections':
        allowAuthenticated = true;
      case 'connectedIdentitiesCanViewConnections':
        allowConnected = true;
    }

    await updateFlag({
      name: 'anonymousVisitorsCanViewConnections',
      value: allowAnonymous,
    });
    await updateFlag({
      name: 'authenticatedIdentitiesCanViewConnections',
      value: allowAuthenticated,
    });
    await updateFlag({
      name: 'connectedIdentitiesCanViewConnections',
      value: allowConnected,
    });
  };

  const handleCanViewWhoIFollowChange: React.MouseEventHandler = async (e) => {
    let allowAnonymous = false;
    let allowAuthenticated = false;
    let allowConnected = false;

    switch (e.currentTarget.id) {
      case 'anonymousVisitorsCanViewWhoIFollow':
        allowAnonymous = true;
      case 'authenticatedIdentitiesCanViewWhoIFollow':
        allowAuthenticated = true;
      case 'connectedIdentitiesCanViewWhoIFollow':
        allowConnected = true;
    }

    await updateFlag({
      name: 'anonymousVisitorsCanViewWhoIFollow',
      value: allowAnonymous,
    });
    await updateFlag({
      name: 'authenticatedIdentitiesCanViewWhoIFollow',
      value: allowAuthenticated,
    });
    await updateFlag({
      name: 'connectedIdentitiesCanViewWhoIFollow',
      value: allowConnected,
    });
  };

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
            <RadioOption
              label={t('Everyone')}
              description={t(
                'Everyone that visits your homepage will see an overview of your connections'
              )}
              name="canViewConnections"
              id="anonymousVisitorsCanViewConnections"
              defaultChecked={
                systemSettings?.anonymousVisitorsCanViewConnections === true &&
                systemSettings?.authenticatedIdentitiesCanViewConnections === true &&
                systemSettings?.allConnectedIdentitiesCanViewConnections === true
              }
              onClick={handleCanViewConnectionsChange}
            />

            <RadioOption
              label={t('Authenticated')}
              description={t(
                'Authenticated people that visit your public site will see an overview of your connections'
              )}
              name="canViewConnections"
              id="authenticatedIdentitiesCanViewConnections"
              defaultChecked={
                systemSettings?.anonymousVisitorsCanViewConnections === false &&
                systemSettings?.authenticatedIdentitiesCanViewConnections === true &&
                systemSettings?.allConnectedIdentitiesCanViewConnections === true
              }
              onClick={handleCanViewConnectionsChange}
            />

            <RadioOption
              label={t('Connected')}
              description={t(
                'Connected people that visit your public site will see an overview of your connections'
              )}
              name="canViewConnections"
              id="connectedIdentitiesCanViewConnections"
              defaultChecked={
                systemSettings?.anonymousVisitorsCanViewConnections === false &&
                systemSettings?.authenticatedIdentitiesCanViewConnections === false &&
                systemSettings?.allConnectedIdentitiesCanViewConnections === true
              }
              onClick={handleCanViewConnectionsChange}
            />
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
            <RadioOption
              label={t('Everyone')}
              description={t(
                'Everyone that visits your homepage will see an overview of who you follow'
              )}
              id="anonymousVisitorsCanViewWhoIFollow"
              name="canViewWhoIFollow"
              defaultChecked={
                systemSettings?.anonymousVisitorsCanViewWhoIFollow === true &&
                systemSettings?.authenticatedIdentitiesCanViewWhoIFollow === true &&
                systemSettings?.allConnectedIdentitiesCanViewWhoIFollow === true
              }
              onClick={handleCanViewWhoIFollowChange}
            />
            <RadioOption
              label={t('Authenticated')}
              description={t(
                'Authenticated people that visit your public site will see an overview of who you follow'
              )}
              id="authenticatedIdentitiesCanViewWhoIFollow"
              name="canViewWhoIFollow"
              defaultChecked={
                systemSettings?.anonymousVisitorsCanViewWhoIFollow === false &&
                systemSettings?.authenticatedIdentitiesCanViewWhoIFollow === true &&
                systemSettings?.allConnectedIdentitiesCanViewWhoIFollow === true
              }
              onClick={handleCanViewWhoIFollowChange}
            />
            <RadioOption
              label={t('Connected')}
              description={t(
                'Connected people that visit your public site will see an overview of who you follow'
              )}
              id="connectedIdentitiesCanViewWhoIFollow"
              name="canViewWhoIFollow"
              defaultChecked={
                systemSettings?.anonymousVisitorsCanViewWhoIFollow === false &&
                systemSettings?.authenticatedIdentitiesCanViewWhoIFollow === false &&
                systemSettings?.allConnectedIdentitiesCanViewWhoIFollow === true
              }
              onClick={handleCanViewWhoIFollowChange}
            />
          </Section>
        </>
      )}
    </>
  );
};

const RadioOption = ({
  label,
  description,
  id,
  name,
  onClick,
  defaultChecked,
}: {
  label: string;
  description: string;
  id: string;
  name: string;
  onClick: React.MouseEventHandler;
  defaultChecked: boolean;
}) => {
  return (
    <div className="mb-5 flex flex-row">
      <Label htmlFor={id} className="my-auto mr-2 flex flex-col">
        {label}
        <small className="text-sm text-gray-400">{description}</small>
      </Label>

      <RadioButton
        className="ml-auto"
        name={name}
        id={id}
        defaultChecked={defaultChecked}
        onClick={onClick}
      />
    </div>
  );
};
