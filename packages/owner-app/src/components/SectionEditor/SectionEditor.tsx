import { ProfileSection } from '@youfoundation/js-lib';
import { useState } from 'react';
import { t } from '../../helpers/i18n/dictionary';
import useProfileSections from '../../hooks/profiles/useProfileSections';
import { ErrorNotification } from '@youfoundation/common-app';
import ActionButton from '../ui/Buttons/ActionButton';
import Input from '../Form/Input';
import Label from '../Form/Label';
import Section from '../ui/Sections/Section';

const SectionEditor = ({
  section,
  profileId,

  onClose,
  className,
}: {
  section: ProfileSection;
  profileId: string;
  onClose: () => void;
  className?: string;
}) => {
  const [sectionData, setSectionData] = useState({ ...section });
  const {
    save: { mutateAsync: saveSection, status: saveSectionStatus, error: saveSectionError },
    remove: { mutateAsync: removeSection, status: removeSectionState, error: removeSectionError },
  } = useProfileSections({});

  const handleChange = (e: { target: { value: unknown; name: string } }) => {
    const newSectionData: Record<string, unknown> = { ...sectionData };
    newSectionData[e.target.name] = e.target.value;

    setSectionData(newSectionData as unknown as ProfileSection);
  };

  return (
    <>
      <ErrorNotification error={saveSectionError} />
      <ErrorNotification error={removeSectionError} />

      <Section title={`${t('Edit')}: ${section.name}`} className={className ?? ''}>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            saveSection(
              { profileId: profileId, profileSection: sectionData },
              {
                onSuccess: () => {
                  onClose();
                },
              }
            );
          }}
        >
          <div className="mb-5">
            <Label htmlFor="name">{t('Name')}</Label>
            <Input id="name" name="name" defaultValue={section.name} onChange={handleChange} />
          </div>

          <div className="-m-2 flex flex-row-reverse">
            <ActionButton type="primary" className="m-2" state={saveSectionStatus}>
              {t('Save')}
            </ActionButton>
            <ActionButton
              type="secondary"
              className="m-2"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              {t('Cancel')}
            </ActionButton>
            <ActionButton
              type="remove"
              icon={'trash'}
              className="m-2 mr-auto"
              state={removeSectionState}
              onClick={() => removeSection({ profileId, profileSection: section })}
              confirmOptions={{
                title: t('Remove Section'),
                body: t(
                  'Are you sure you want to remove this section, this action cannot be undone. All attributes within this section will also be removed.'
                ),
                buttonText: t('Remove'),
              }}
            >
              {t('Remove')}
            </ActionButton>
          </div>
        </form>
      </Section>
    </>
  );
};

export default SectionEditor;
