import { Label, t, ImageSelector, usePayloadBlob } from '@youfoundation/common-app';
import { MinimalProfileFields, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
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
  const { data: imageBlob } = usePayloadBlob(
    fileId,
    attribute.data?.[MinimalProfileFields.ProfileImageKey],
    targetDrive,
    lastModified
  );

  const dataVal = attribute.data?.[MinimalProfileFields.ProfileImageKey];
  const defaultValue =
    dataVal instanceof Blob ? dataVal : dataVal ? imageBlob || undefined : undefined;

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
