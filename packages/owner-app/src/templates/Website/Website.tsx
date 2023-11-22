import { HomePageAttributes, HomePageConfig } from '@youfoundation/js-lib/public';
import { ActionButton, ActionLink, Save, t } from '@youfoundation/common-app';
import { useHomeAttributes } from '../../hooks/profiles/useHomeAttributes';
import { useStaticFiles } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import AttributeGroup from '../../components/Attribute/AttributeGroup/AttributeGroup';
import { Cloud } from '@youfoundation/common-app';
import { LoadingBlock } from '@youfoundation/common-app';
import Section from '../../components/ui/Sections/Section';
import { AttributeVm } from '../../hooks/profiles/useAttributes';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';
import { AttributeDefinitions } from '../../hooks/profiles/AttributeDefinitions';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { getNewId } from '@youfoundation/js-lib/helpers';

const defaultThemeAttribute: DriveSearchResult<AttributeVm> = {
  fileMetadata: {
    appData: {
      content: {
        id: getNewId(),
        profileId: HomePageConfig.DefaultDriveId,
        type: HomePageAttributes.Theme,
        priority: 1000,
        sectionId: HomePageConfig.AttributeSectionNotApplicable,
        data: { isProtected: true },

        typeDefinition: AttributeDefinitions.Theme,
      },
    },
  },
} as unknown as DriveSearchResult<AttributeVm>;

const Website = () => {
  const { data: themeData, isLoading: themeIsLoading } = useHomeAttributes().fetchTheme;

  return (
    <section>
      <PageMeta
        icon={Cloud}
        title={t('Home settings')}
        actions={
          <>
            <ActionLink href={`https://${window.location.hostname}`} icon={Cloud}>
              {t('Open website')}
            </ActionLink>
          </>
        }
        breadCrumbs={[
          { href: '/owner/profile', title: 'Social Presence' },
          { title: t('Home settings') },
        ]}
      />
      {themeIsLoading ? (
        <div className="-m-5 pt-5">
          <LoadingBlock className="m-5 h-20" />
        </div>
      ) : (
        <AttributeGroup
          attributes={themeData?.length ? themeData : [defaultThemeAttribute]}
          groupTitle={t('Theme')}
        />
      )}

      <PublishOptions />
    </section>
  );
};

const PublishOptions = () => {
  const {
    mutate: publishFile,
    status: publishStatus,
    error: publishFileError,
  } = useStaticFiles().publish;

  return (
    <>
      <ErrorNotification error={publishFileError} />
      <Section
        title={
          <>
            <Cloud className="inline-block h-4 w-4" /> {t('Publish your public data')}
          </>
        }
      >
        <div className="flex flex-row">
          <ActionButton
            onClick={() => publishFile()}
            state={publishStatus}
            icon={Save}
            className="ml-auto"
          >
            {t('Publish static file')}
          </ActionButton>
        </div>
      </Section>
    </>
  );
};

export default Website;
