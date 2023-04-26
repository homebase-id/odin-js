import { HomePageAttributes, HomePageConfig, toGuidId } from '@youfoundation/js-lib';
import { t } from '../../helpers/i18n/dictionary';
import useHomeAttributes from '../../hooks/profiles/useHomeAttributes';
import useStaticFiles from '../../hooks/staticFiles/useStaticFiles';
import ErrorNotification from '../../components/ui/Alerts/ErrorNotification/ErrorNotification';
import AttributeGroup from '../../components/Attribute/AttributeGroup/AttributeGroup';
import ActionButton from '../../components/ui/Buttons/ActionButton';
import Cloud from '../../components/ui/Icons/Cloud/Cloud';
import PageMeta from '../../components/ui/Layout/PageMeta/PageMeta';
import LoadingParagraph from '../../components/ui/Loaders/LoadingParagraph/LoadingParagraph';
import Section from '../../components/ui/Sections/Section';
import ActionLink from '../../components/ui/Buttons/ActionLink';

const defaultHomeAttribute = {
  id: toGuidId('default_home_attribute'),
  profileId: HomePageConfig.DefaultDriveId,
  type: HomePageAttributes.HomePage,
  priority: 1000,
  sectionId: HomePageConfig.AttributeSectionNotApplicable,
  data: { isNew: true },
  acl: undefined,
  typeDefinition: {
    type: HomePageAttributes.HomePage,
    name: 'Homepage',
    description: '',
  },
};

const defaultThemeAttribute = {
  id: toGuidId('default_theme_attribute'),
  profileId: HomePageConfig.DefaultDriveId,
  type: HomePageAttributes.Theme,
  priority: 1000,
  sectionId: HomePageConfig.AttributeSectionNotApplicable,
  data: { isNew: true },
  acl: undefined,
  typeDefinition: {
    type: HomePageAttributes.Theme,
    name: 'Theme',
    description: '',
  },
};

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
            icon="save"
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
