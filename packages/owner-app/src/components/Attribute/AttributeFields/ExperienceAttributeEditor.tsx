import { Label, t, ImageSelector, Input } from '@youfoundation/common-app';
import { MinimalProfileFields, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { usePayloadBlob } from '../../../hooks/media/usePayloadBlob';
import { RichTextEditor } from '@youfoundation/rich-text-editor';

export const ExperienceAttributeEditor = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const targetDrive = GetTargetDriveFromProfileId(attribute.profileId);
  const { data: imageBlob } = usePayloadBlob(
    attribute.fileId,
    attribute.data?.[MinimalProfileFields.ProfileImageId],
    targetDrive
  );

  return (
    <>
      <div className="mb-5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-title`}>{t('Title')}</Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-experience-title`}
          name={MinimalProfileFields.ExperienceTitleId}
          defaultValue={attribute.data?.[MinimalProfileFields.ExperienceTitleId] ?? ''}
          onChange={onChange}
          placeholder={t('Job, project, life event, etc.')}
        />
      </div>
      <div className="mb-5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-description`}>
          {t('Description')}
        </Label>
        <RichTextEditor
          uniqueId={attribute.fileId}
          name={MinimalProfileFields.ExperienceDecriptionId}
          defaultValue={attribute.data?.[MinimalProfileFields.ExperienceDecriptionId] ?? ''}
          onChange={onChange}
          className="rounded border border-gray-300 px-2 pb-3 dark:border-gray-700"
        />
      </div>
      <div className="mb-5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-link`}>{t('Link')}</Label>
        <Input
          id={`${attribute.fileId ?? 'new'}-experience-link`}
          name={MinimalProfileFields.ExperienceLinkId}
          defaultValue={attribute.data?.[MinimalProfileFields.ExperienceLinkId] ?? ''}
          onChange={onChange}
          placeholder={t('Link to the project, company, etc.')}
        />
      </div>
      <div className="mb-5">
        <Label htmlFor={`${attribute.fileId ?? 'new'}-experience-image`}>{t('Image')}</Label>
        <ImageSelector
          id={`${attribute.fileId ?? 'new'}-experience-image`}
          name={MinimalProfileFields.ExperienceImageFileId}
          defaultValue={imageBlob || undefined}
          onChange={(e) =>
            onChange({
              target: {
                name: e.target.name,
                value: e.target.value,
              },
            })
          }
          expectedAspectRatio={1}
          maxHeight={500}
          maxWidth={500}
        />
      </div>
    </>
  );
};
