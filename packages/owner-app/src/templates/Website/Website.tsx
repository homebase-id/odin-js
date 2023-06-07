import { HomePageAttributes, HomePageConfig } from '@youfoundation/js-lib/public';
import { ActionButton, ActionLink, Save, t } from '@youfoundation/common-app';
import useHomeAttributes from '../../hooks/profiles/useHomeAttributes';
import { useStaticFiles } from '@youfoundation/common-app';
import { ErrorNotification } from '@youfoundation/common-app';
import AttributeGroup from '../../components/Attribute/AttributeGroup/AttributeGroup';
import { Cloud } from '@youfoundation/common-app';
import { LoadingParagraph } from '@youfoundation/common-app';
import Section from '../../components/ui/Sections/Section';
import { AttributeVm } from '../../hooks/profiles/useAttributes';
import { PageMeta } from '../../components/ui/PageMeta/PageMeta';

const defaultHomeAttribute: AttributeVm = {
  profileId: HomePageConfig.DefaultDriveId,
  type: HomePageAttributes.HomePage,
  priority: 1000,
  sectionId: HomePageConfig.AttributeSectionNotApplicable,
  data: { isNew: true, isProtected: true },
  acl: undefined,
  typeDefinition: {
    type: HomePageAttributes.HomePage,
    name: 'Homepage',
    description: '',
  },
} as unknown as AttributeVm;

const defaultThemeAttribute: AttributeVm = {
  profileId: HomePageConfig.DefaultDriveId,
  type: HomePageAttributes.Theme,
  priority: 1000,
  sectionId: HomePageConfig.AttributeSectionNotApplicable,
  data: { isNew: true, isProtected: true },
  acl: undefined,
  typeDefinition: {
    type: HomePageAttributes.Theme,
    name: 'Theme',
    description: '',
  },
} as unknown as AttributeVm;

const Website = () => {
  const { data: homeData, isLoading: homeIsLoading } = useHomeAttributes().fetchHome;
  const { data: themeData, isLoading: themeIsLoading } = useHomeAttributes().fetchTheme;

  return (
    <section>
      <PageMeta
        icon={Cloud}
        title={t('Homepage')}
        actions={
          <>
            <ActionLink href={`https://${window.location.hostname}/home`} icon={Cloud}>
              {t('Open website')}
            </ActionLink>
          </>
        }
        breadCrumbs={[
          { href: '/owner/profile', title: 'Social Presence' },
          { title: t('Homepage') },
        ]}
      />
      {homeIsLoading ? (
        <div className="-m-5 pt-5">
          <LoadingParagraph className="m-5 h-20" />
        </div>
      ) : (
        <AttributeGroup
          attributes={homeData?.length ? homeData : [defaultHomeAttribute]}
          groupTitle={t('Home')}
        />
      )}
      {themeIsLoading ? (
        <div className="-m-5 pt-5">
          <LoadingParagraph className="m-5 h-20" />
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
