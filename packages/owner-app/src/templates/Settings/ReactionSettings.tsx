/* eslint-disable no-fallthrough */
import { ErrorNotification, t, Label } from '@youfoundation/common-app';
import RadioButton from '../../components/Form/RadioButton';
import Section from '../../components/ui/Sections/Section';
import { useSettings } from '../../hooks/settings/useSettings';

export const ReactionSettings = () => {
  const {
    fetchFlags: { data: systemSettings, isLoading: systemSettingsLoading },
    updateFlag: { mutate: updateFlag, error: updateFlagError },
  } = useSettings();

  const handleEmojiReactionsChange: React.MouseEventHandler = async (e) => {
    let allowAuthenticated = false;
    let allowConnected = false;

    switch (e.currentTarget.id) {
      case 'authenticatedIdentitiesCanReactOnAnonymousDrives':
        allowAuthenticated = true;
      case 'connectedIdentitiesCanReactOnAnonymousDrives':
        allowConnected = true;
    }

    await updateFlag({
      name: 'authenticatedIdentitiesCanReactOnAnonymousDrives',
      value: allowAuthenticated,
    });
    await updateFlag({
      name: 'connectedIdentitiesCanReactOnAnonymousDrives',
      value: allowConnected,
    });
  };

  const handleCommentReactionsChange: React.MouseEventHandler = async (e) => {
    let allowConnected = false;

    switch (e.currentTarget.id) {
      case 'connectedIdentitiesCanCommentOnAnonymousDrives':
        allowConnected = true;
    }

    await updateFlag({
      name: 'connectedIdentitiesCanCommentOnAnonymousDrives',
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
                {t('Who can react with an emoji on your public posts?')}
                <small className="text-sm text-gray-400">
                  {t(
                    'People that are member of a circle that has access to react will always be able to do so'
                  )}
                </small>
              </div>
            }
          >
            <RadioOption
              label={t('Authenticated')}
              description={t(
                'Every authenticated user will be able to react with an emoji to your public posts'
              )}
              name="whoCanReactWithAnEmoji"
              id="authenticatedIdentitiesCanReactOnAnonymousDrives"
              defaultChecked={
                systemSettings?.connectedIdentitiesCanReactOnAnonymousDrives === true &&
                systemSettings?.authenticatedIdentitiesCanReactOnAnonymousDrives === true
              }
              onClick={handleEmojiReactionsChange}
            />

            <RadioOption
              label={t('Connected')}
              description={t(
                'Every connected user will be able to react with an emoji to your public posts'
              )}
              name="whoCanReactWithAnEmoji"
              id="connectedIdentitiesCanReactOnAnonymousDrives"
              defaultChecked={
                systemSettings?.authenticatedIdentitiesCanReactOnAnonymousDrives === false &&
                systemSettings?.connectedIdentitiesCanReactOnAnonymousDrives
              }
              onClick={handleEmojiReactionsChange}
            />
            <RadioOption
              label={t('Nobody')}
              description={t(
                'Nobody will be able to react with an emoji to your public posts, unless a circle has access to do so'
              )}
              name="whoCanReactWithAnEmoji"
              id="nobodyCanReactOnAnonymousDrives"
              defaultChecked={
                systemSettings?.authenticatedIdentitiesCanReactOnAnonymousDrives === false &&
                systemSettings?.connectedIdentitiesCanReactOnAnonymousDrives === false
              }
              onClick={handleEmojiReactionsChange}
            />
          </Section>

          <Section
            title={
              <div className="flex flex-col">
                {t('Who can comment on your public posts?')}
                <small className="text-sm text-gray-400">
                  {t(
                    'People that are member of a circle that has access to comment will always be able to do so'
                  )}
                </small>
              </div>
            }
          >
            <RadioOption
              label={t('Connected')}
              description={t('Every connected user will be able to comment on your public posts')}
              name="whoCanComment"
              id="connectedIdentitiesCanCommentOnAnonymousDrives"
              defaultChecked={
                systemSettings?.connectedIdentitiesCanCommentOnAnonymousDrives ?? true
              }
              onClick={handleCommentReactionsChange}
            />

            <RadioOption
              label={t('Nobody')}
              description={t(
                'Nobody will be able to react with a comment to your public posts, unless a circle has access to do so'
              )}
              name="whoCanComment"
              id="nobodyCanCommentOnAnonymousDrives"
              defaultChecked={!systemSettings?.connectedIdentitiesCanCommentOnAnonymousDrives}
              onClick={handleCommentReactionsChange}
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
