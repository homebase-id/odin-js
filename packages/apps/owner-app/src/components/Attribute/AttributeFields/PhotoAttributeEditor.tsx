import { Label, t, ImageSelector, useImage } from '@homebase-id/common-app';
import { MinimalProfileFields, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';

export const PhotoAttributeEditor = ({
  fileId,
  lastModified,
  attribute,
  onChange,
}: {
  fileId?: string;
  lastModified: number | undefined;
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const targetDrive = GetTargetDriveFromProfileId(attribute.profileId);
  const { data: imageData } = useImage({
    imageFileId: fileId,
    imageFileKey: attribute.data?.[MinimalProfileFields.ProfileImageKey],
    imageDrive: targetDrive,
    lastModified,
  }).fetch;

  const dataVal = attribute.data?.[MinimalProfileFields.ProfileImageKey];
  const defaultValue =
    dataVal instanceof Blob ? dataVal : dataVal ? imageData?.url || undefined : undefined;

  return (
    <div className="mb-5">
      <Label htmlFor={`${fileId ?? 'new'}-profileImageKey`}>{t('Profile Image')}</Label>
      <ImageSelector
        id={`${fileId ?? 'new'}-profileImageKey`}
        name={MinimalProfileFields.ProfileImageKey}
        defaultValue={defaultValue}
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
  );
};
