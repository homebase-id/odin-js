import { BuiltInAttributes, BuiltInProfiles } from '@youfoundation/js-lib';
import AttributeGroup from '../../../components/Attribute/AttributeGroup/AttributeGroup';
import Heart from '../../../components/ui/Icons/Heart/Heart';
import PageMeta from '../../../components/ui/Layout/PageMeta/PageMeta';
import LoadingParagraph from '../../../components/ui/Loaders/LoadingParagraph/LoadingParagraph';
import { t } from '../../../helpers/i18n/dictionary';
import useAttributes from '../../../hooks/profiles/useAttributes';

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
