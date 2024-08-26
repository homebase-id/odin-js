import { t, ActionButton } from '@homebase-id/common-app';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { useAttribute } from '../../../hooks/profiles/useAttribute';
import Section from '../../ui/Sections/Section';
import { Exclamation, Trash } from '@homebase-id/common-app/icons';

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
};

// Broken attributes are attributes that have no content, but are there on the profile drive
export const BrokenAttribute = ({
  attribute,
  profileId,
}: {
  attribute: HomebaseFile<undefined>;
  profileId: string;
}) => {
  const {
    remove: { mutate: removeAttr },
  } = useAttribute();

  return (
    <Section
      title={
        <span className="flex flex-row items-center gap-2">
          <Exclamation className="h-5 w-5" />
          {t('Broken attribute')}{' '}
        </span>
      }
    >
      <p>{t('This attribute is broken, and cannot be fixed. Please remove it.')}</p>
      <p className="text-sm text-slate-400">
        {t('Created')}:{' '}
        {new Date(attribute.fileMetadata.created).toLocaleDateString(undefined, dateFormat)} <br />
        {t('Updated')}:{' '}
        {new Date(attribute.fileMetadata.updated).toLocaleDateString(undefined, dateFormat)}
      </p>
      <div className="flex flex-row-reverse">
        <ActionButton
          type="remove"
          icon={Trash}
          onClick={() => removeAttr({ attribute, overrideProfileId: profileId })}
        >
          {t('Remove')}
        </ActionButton>
      </div>
    </Section>
  );
};
