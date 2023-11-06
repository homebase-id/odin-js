import { Label, t, ImageSelector } from '@youfoundation/common-app';
import { MinimalProfileFields, GetTargetDriveFromProfileId } from '@youfoundation/js-lib/profile';
import { AttributeVm } from '../../../hooks/profiles/useAttributes';
import { usePayloadBlob } from '../../../hooks/media/usePayloadBlob';

export const PhotoAttributeEditor = ({
  attribute,
  onChange,
}: {
  attribute: AttributeVm;
  onChange: (e: { target: { value: unknown; name: string } }) => void;
}) => {
  const targetDrive = GetTargetDriveFromProfileId(attribute.profileId);
  const { data: imageBlob } = usePayloadBlob(
    attribute.fileId,
    attribute.data?.[MinimalProfileFields.ProfileImageKey],
    targetDrive
  );

  return (
    <div className="mb-5">
      <Label htmlFor={`${attribute.fileId ?? 'new'}-profileImageKey`}>{t('Profile Image')}</Label>
      <ImageSelector
        id={`${attribute.fileId ?? 'new'}-profileImageKey`}
        name={MinimalProfileFields.ProfileImageKey}
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
  );
};
