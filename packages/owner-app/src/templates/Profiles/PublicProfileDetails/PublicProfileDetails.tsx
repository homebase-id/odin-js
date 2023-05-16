import { BuiltInAttributes, BuiltInProfiles } from '@youfoundation/js-lib';
import AttributeGroup from '../../../components/Attribute/AttributeGroup/AttributeGroup';
import { Heart } from '@youfoundation/common-app';
import { LoadingParagraph } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import useAttributes from '../../../hooks/profiles/useAttributes';
import { PageMeta } from '../../../components/ui/PageMeta/PageMeta';

const PublicProfileDetails = () => {
  const { data: attributes, isLoading } = useAttributes({
    profileId: BuiltInProfiles.StandardProfileId,
    sectionId: BuiltInProfiles.PersonalInfoSectionId,
  }).fetch;

  const nameAttributes = attributes?.filter((attr) => attr.type === BuiltInAttributes.Name);
  const photoAttributes = attributes?.filter((attr) => attr.type === BuiltInAttributes.Photo);

  return (
    <>
      <PageMeta icon={Heart} title={t('Public Profile')} />
      {isLoading ? (
        <>
          <LoadingParagraph className="m-5 h-20" />
          <LoadingParagraph className="m-5 h-20" />
        </>
      ) : (
        <>
          {nameAttributes ? (
            <AttributeGroup groupTitle={t('Name')} attributes={nameAttributes} key={'name'} />
          ) : null}
          {photoAttributes ? (
            <AttributeGroup groupTitle={t('Photo')} attributes={photoAttributes} key={'photo'} />
          ) : null}
        </>
      )}
    </>
  );
};

export default PublicProfileDetails;
