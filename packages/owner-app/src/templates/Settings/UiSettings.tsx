import { t, Label } from '@youfoundation/common-app';
import Section from '../../components/ui/Sections/Section';
import { useSettings } from '../../hooks/settings/useSettings';
import CheckboxToggle from '../../components/Form/CheckboxToggle';

export const UiSettings = () => {
  const { data: currentSettings } = useSettings().fetchUiSettings;
  const { mutate: updateUiSetting } = useSettings().updateUiSetting;

  const isAutoPublish = !currentSettings?.disableAutoPublish;

  console.log('currentSettings', currentSettings);

  return (
    <>
      <Section title={<div className="flex flex-col">{t('Attribute save handling')}</div>}>
        <div className="mb-5 flex flex-row gap-4">
          <div className="my-auto">
            <CheckboxToggle
              name={'attributeAutoPublish'}
              id={'attributeAutoPublish'}
              defaultChecked={isAutoPublish}
              onClick={(e) =>
                e.currentTarget.checked
                  ? updateUiSetting({ disableAutoPublish: false })
                  : updateUiSetting({ disableAutoPublish: true })
              }
            />
          </div>
          <Label htmlFor={'attributeAutoPublish'} className="my-auto mr-2 flex flex-col">
            {t('Auto publish changes on attributes to the static files')}
            <small className="text-sm text-gray-400">
              {t(
                'Each time a change on an attribute is saved, a publish of the static files will be triggered'
              )}
            </small>
          </Label>
        </div>
      </Section>
    </>
  );
};
