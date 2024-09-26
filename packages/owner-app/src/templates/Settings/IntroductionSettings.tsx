import { ErrorNotification, t, Label, Radio } from '@homebase-id/common-app';
import Section from '../../components/ui/Sections/Section';
import { useSettings } from '../../hooks/settings/useSettings';

export const IntroductionSettings = () => {
  const {
    fetchFlags: { data: systemSettings, isLoading: systemSettingsLoading },
    updateFlag: { mutate: updateFlag, error: updateFlagError },
  } = useSettings();

  const handleEmojiReactionsChange: React.MouseEventHandler = async (e) => {
    await updateFlag({
      name: 'disableAutoAcceptIntroductions',
      value: e.currentTarget.id === 'disableAutoAcceptIntroductions',
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
                {t('Auto accept introductions')}
                <small className="text-sm text-gray-400">
                  {t(
                    `Connected identities within a Circle that have "Send Introduction" permissions
                    can introduce you to others. When you are introduced, you will receive a connection request.
                    When enabled, this feature will automatically accept connection requests from those introduced to you.`
                  )}
                </small>
              </div>
            }
          >
            <RadioOption
              label={t('Enabled')}
              description={t('Accept all connection requests following an introduction')}
              name="disableAutoAcceptIntroductions"
              id="enableAutoAcceptIntroductions"
              defaultChecked={!systemSettings?.disableAutoAcceptIntroductions}
              onClick={handleEmojiReactionsChange}
            />

            <RadioOption
              label={t('Disabled')}
              description={t(
                'Connection requests will not be immediately accepted. And I will review any requests following an introduction'
              )}
              name="disableAutoAcceptIntroductions"
              id="disableAutoAcceptIntroductions"
              defaultChecked={systemSettings?.disableAutoAcceptIntroductions}
              onClick={handleEmojiReactionsChange}
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
    <div className="mb-5 flex flex-row gap-4">
      <Radio
        name={name}
        id={id}
        defaultChecked={defaultChecked}
        onClick={onClick}
        className="mt-2"
      />
      <Label htmlFor={id} className="my-auto mr-2 flex flex-col">
        {label}
        <small className="text-sm text-gray-400">{description}</small>
      </Label>
    </div>
  );
};
