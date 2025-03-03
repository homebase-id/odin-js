import { getNewId, slugify, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AttributeVm, useAttributes } from '../../../hooks/profiles/useAttributes';
import AttributeCreator from '../../../components/Attribute/AttributeCreator/AttributeCreator';
import Section from '../../../components/ui/Sections/Section';
import AttributeGroup from '../../../components/Attribute/AttributeGroup/AttributeGroup';
import SectionEditor from '../../../components/SectionEditor/SectionEditor';
import { useProfileSections } from '../../../hooks/profiles/useProfileSections';
import Submenu from '../../../components/SubMenu/SubMenu';
import LoadingDetailPage from '../../../components/ui/Loaders/LoadingDetailPage/LoadingDetailPage';
import { PageMeta } from '@homebase-id/common-app';
import { BuiltInProfiles, ProfileSection } from '@homebase-id/js-lib/profile';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { BrokenAttribute } from '../../../components/Attribute/BrokenAttribute/BrokenAttribute';
import ProfileDialog from '../../../components/Attribute/ProfileDialog/ProfileDialog';
import {
  Input,
  useProfiles,
  t,
  ActionButton,
  ActionGroup,
  ErrorNotification,
  Label,
  LoadingBlock,
  ErrorBoundary,
} from '@homebase-id/common-app';
import { Heart, Pencil, Trash, Plus, Person, Wallet, Cloud } from '@homebase-id/common-app/icons';
import { HomePageConfig } from '@homebase-id/js-lib/public';

const ProfileDetails = () => {
  const {
    fetchProfiles: { data: profiles, isLoading: profilesLoading },
    removeProfile: { mutateAsync: removeProfile },
  } = useProfiles();
  const { profileKey, sectionKey } = useParams();
  const navigate = useNavigate();
  const [isOpenEdit, setIsOpenEdit] = useState(false);

  const profileDef = profiles?.find((curr) => {
    return curr.slug === profileKey;
  });
  const {
    fetchAll: { data: sections, isLoading: sectionsLoading },
  } = useProfileSections({
    profileId: profileDef?.profileId,
  });

  const activeSectionKey =
    (sectionKey && decodeURIComponent(sectionKey)) ||
    (sections?.length ? sections[0].sectionId : '');

  if (profilesLoading) return <LoadingDetailPage />;
  if (!profiles) return <>{t('no-data-found')}</>;
  if (!profileDef) return <>{t('Incorrect profile path')}</>;

  const isCreateSection = activeSectionKey === 'new' || (!sections?.length && !sectionsLoading);

  const activeSection = isCreateSection
    ? undefined
    : sections?.find((sect) => {
        return sect.sectionId === activeSectionKey;
      }) || sections?.[0];

  const tabItems = sections?.length
    ? sections.map((sect, index) => {
        return {
          title: sect.name,
          key: sect.sectionId,
          path:
            index === 0
              ? `/owner/profile/${profileKey}/${encodeURIComponent(sect.sectionId)}`
              : `/owner/profile/${profileKey}/${encodeURIComponent(sect.sectionId)}`,
        };
      })
    : [];

  return (
    <>
      <PageMeta
        icon={
          stringGuidsEqual(profileDef.profileId, BuiltInProfiles.StandardProfileId)
            ? Person
            : stringGuidsEqual(profileDef.profileId, HomePageConfig.DefaultDriveId)
              ? Cloud
              : stringGuidsEqual(profileDef.profileId, BuiltInProfiles.WalletId)
                ? Wallet
                : Heart
        }
        title={profileDef.name}
        actions={
          profileDef.isSystemSection === true ? null : (
            <>
              <ActionButton onClick={() => setIsOpenEdit(true)} icon={Pencil}>
                {t('Edit Profile')}
              </ActionButton>

              <ActionGroup
                type="mute"
                size="square"
                options={[
                  {
                    label: t('Remove profile'),
                    onClick: async () => {
                      await removeProfile(profileDef.profileId);
                      navigate(-1);
                    },
                    confirmOptions: {
                      title: t('Remove profile'),
                      body: t(
                        'Are you sure you want to remove this profile, this action cannot be undone. All data within this profile will be removed.'
                      ),
                      buttonText: t('Remove'),
                    },
                    icon: Trash,
                  },
                ]}
              />
            </>
          )
        }
        breadCrumbs={[
          { href: '/owner/profile', title: 'Personal data' },
          ...(profileKey ? [{ title: profileKey }] : []),
        ]}
      />

      <Submenu
        items={[
          ...tabItems,
          {
            title: <Plus className="h-5 w-5" />,
            text: `-- ${t('Create new section')} --`,
            key: 'new',
            path: `/owner/profile/${profileKey}/new`,
            className: 'ml-auto flex items-center',
          },
        ]}
        isLoading={sectionsLoading}
        className="mb-4"
      />

      {isCreateSection || !activeSection ? (
        <ProfileSectionCreator
          profileId={profileDef.profileId}
          onCreate={(sectionId) => navigate(`/owner/profile/${profileKey}/${sectionId}`)}
        />
      ) : (
        <ProfileSectionEditor
          section={activeSection}
          profileId={profileDef?.profileId}
          key={activeSection?.sectionId}
          isParentLoading={sectionsLoading}
        />
      )}
      <ProfileDialog
        isOpen={isOpenEdit}
        title={t('Edit Profile: ') + profileDef.name}
        confirmText={t('Save')}
        defaultValue={profileDef}
        onCancel={() => {
          setIsOpenEdit(false);
        }}
        onConfirm={(newDef) => {
          setIsOpenEdit(false);
          if (newDef.name !== profileDef.name) navigate(`/owner/profile/${slugify(newDef.name)}`);
        }}
      />
    </>
  );
};

const ProfileSectionCreator = ({
  profileId,
  onCreate,
}: {
  profileId: string;
  onCreate: (sectionId: string) => void;
}) => {
  const navigate = useNavigate();
  const {
    fetchAll: { data: profileSections },
    save: {
      mutateAsync: saveProfileSection,
      status: saveProfileSectionStatus,
      error: saveSectionError,
    },
  } = useProfileSections({ profileId: profileId });
  const [name, setName] = useState('');

  const createSection: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const sectionId = getNewId();

    const newProfileSection = {
      sectionId: sectionId,
      attributes: [],
      priority: profileSections?.length
        ? Math.max(...profileSections.map((sect) => sect.priority)) + 1000
        : 1000,
      isSystemSection: false,
      name: name,
    };

    await saveProfileSection({
      profileId: profileId,
      profileSection: newProfileSection,
    });
    onCreate(sectionId);
  };

  return (
    <>
      <ErrorNotification error={saveSectionError} />
      <Section title="New: section">
        <form onSubmit={createSection}>
          <div className="mb-5">
            <Label htmlFor="name">{t('Name')}</Label>
            <Input
              id="name"
              name="sectionName"
              onChange={(e) => {
                setName(e.target.value);
              }}
              required
            />
          </div>
          <div className="flex flex-row-reverse gap-2">
            <ActionButton state={saveProfileSectionStatus}>{t('Add section')}</ActionButton>
            <ActionButton type="secondary" onClick={() => navigate(-1)}>
              {t('Cancel')}
            </ActionButton>
          </div>
        </form>
      </Section>
    </>
  );
};

const ProfileSectionEditor = ({
  section,
  profileId,
  isParentLoading,
}: {
  section: ProfileSection;
  profileId: string;
  isParentLoading: boolean;
}) => {
  const { data: attributes, isLoading } = useAttributes({
    profileId: profileId,
    sectionId: section?.sectionId,
  }).fetch;
  const [isEditActive, setIsEditActive] = useState(false);

  if (!attributes || isLoading || isParentLoading) {
    return (
      <div className="-m-5 pt-5">
        <LoadingBlock className="m-5 h-20" />
        <LoadingBlock className="m-5 h-20" />
        <LoadingBlock className="m-5 h-20" />
        <LoadingBlock className="m-5 h-20" />
      </div>
    );
  }

  const filteredAttributes: HomebaseFile<AttributeVm>[] = attributes.filter(
    (attr) => attr.fileMetadata.appData.content
  ) as HomebaseFile<AttributeVm>[];

  const emptyAttributes: HomebaseFile<undefined>[] = attributes.filter(
    (attr) => !attr.fileMetadata.appData.content
  ) as HomebaseFile<undefined>[];

  // Find unique types
  const types: string[] = filteredAttributes
    .map((dsr) => dsr.fileMetadata.appData.content)
    .reduce((prevVal, curVal) => {
      if (prevVal.indexOf(curVal.type) !== -1) {
        return prevVal;
      }
      return [...prevVal, curVal.type];
    }, [] as string[]);

  // Find matching attributes for those types
  const groupedAttributes = types.map((currType) => {
    const matchingAttributes = filteredAttributes.filter(
      (attr) => attr.fileMetadata.appData.content.type === currType
    );
    const lowestPrio = Math.min(
      ...matchingAttributes.map((attr) => attr.fileMetadata.appData.content.priority)
    );

    return {
      name:
        matchingAttributes[0]?.fileMetadata.appData.content.typeDefinition?.name ||
        matchingAttributes[0].fileMetadata.appData.content.type,
      attributes: matchingAttributes,
      priority: lowestPrio,
    };
  });
  groupedAttributes.sort((a, b) => a.priority - b.priority);

  const highestPriority = filteredAttributes.reduce((prevValue, currValue) => {
    if (prevValue > currValue.fileMetadata.appData.content.priority) {
      return prevValue;
    } else {
      return currValue.fileMetadata.appData.content.priority;
    }
  }, 0);

  return (
    <>
      {section && !section.isSystemSection ? (
        <div className="pt-5">
          {isEditActive ? (
            <SectionEditor
              key={section.sectionId}
              section={section}
              profileId={profileId}
              onClose={() => setIsEditActive(false)}
              className="bg-white dark:bg-black"
            />
          ) : (
            <section className="items-center bg-white p-3 dark:bg-black sm:flex sm:flex-row">
              <p className="sm:mr-2">{section.name}</p>
              <ActionButton
                type="secondary"
                className="ml-auto"
                onClick={() => setIsEditActive(true)}
              >
                {t('Edit Section')}
              </ActionButton>
            </section>
          )}
        </div>
      ) : null}
      {attributes.length ? (
        groupedAttributes.map((attrGroup, groupIndex) => {
          return (
            <React.Fragment key={attrGroup.name}>
              <ErrorBoundary>
                <AttributeGroup
                  groupTitle={attrGroup.name}
                  attributes={attrGroup.attributes}
                  key={attrGroup.name}
                  groupIndex={groupIndex}
                  groupedAttributes={groupedAttributes}
                />
              </ErrorBoundary>
            </React.Fragment>
          );
        })
      ) : (
        <div className="py-5">{t('section-empty-attributes')}</div>
      )}
      {emptyAttributes.length
        ? emptyAttributes.map((attr) => {
            return <BrokenAttribute attribute={attr} profileId={profileId} key={attr.fileId} />;
          })
        : null}
      <AttributeCreator
        profileId={profileId}
        sectionId={section.sectionId}
        newPriority={highestPriority + 1000}
        excludedTypes={types}
      />
    </>
  );
};

export default ProfileDetails;
