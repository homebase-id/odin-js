import { ProfileSection } from '@youfoundation/js-lib/profile';
import { useState } from 'react';
import { Trash, t } from '@youfoundation/common-app';
import { useProfileSections } from '../../hooks/profiles/useProfileSections';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';
import { Label } from '@youfoundation/common-app';
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

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <ActionButton type="primary" state={saveSectionStatus}>
              {t('Save')}
            </ActionButton>
            <ActionButton
              type="secondary"
              onClick={(e) => {
                e.preventDefault();
                onClose();
              }}
            >
              {t('Cancel')}
            </ActionButton>
            <ActionButton
              type="remove"
              icon={Trash}
              className="mr-auto"
              state={removeSectionState}
              onClick={() => removeSection({ profileId, profileSection: section })}
              confirmOptions={{
                type: 'critical',
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
