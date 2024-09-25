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
                    'A connected identity can introduce you to another identity. If introductions are auto accepted, the connection will be created without your approval'
                  )}
                </small>
              </div>
            }
          >
            <RadioOption
              label={t('Enabled')}
              description={t(
                'An introduction will be automatically accepted and a connection will be created'
              )}
              name="disableAutoAcceptIntroductions"
              id="enableAutoAcceptIntroductions"
              defaultChecked={!systemSettings?.disableAutoAcceptIntroductions}
              onClick={handleEmojiReactionsChange}
            />

            <RadioOption
              label={t('Disabled')}
              description={t(
                'An introduction will not be automatically accepted and a regular connection request will be shown'
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
