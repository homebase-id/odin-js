import { HomePageAttributes, HomePageConfig } from '@homebase-id/js-lib/public';
import { useHomeAttributes } from '../../hooks/profiles/useHomeAttributes';
import AttributeGroup from '../../components/Attribute/AttributeGroup/AttributeGroup';
import Section from '../../components/ui/Sections/Section';
import { AttributeVm } from '../../hooks/profiles/useAttributes';
import { PageMeta } from '@homebase-id/common-app';
import { AttributeDefinitions } from '../../hooks/profiles/AttributeDefinitions';
import { HomebaseFile } from '@homebase-id/js-lib/core';
import { getNewId } from '@homebase-id/js-lib/helpers';
import {
  t,
  ActionGroup,
  LoadingBlock,
  useStaticFiles,
  ErrorNotification,
  ActionButton,
} from '@homebase-id/common-app';
import { Cloud, Times } from '@homebase-id/common-app/icons';

const defaultThemeAttribute: HomebaseFile<AttributeVm> = {
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
} as unknown as HomebaseFile<AttributeVm>;

const Website = () => {
  const { data: themeData, isLoading: themeIsLoading } = useHomeAttributes().fetchTheme;

  return (
    <section>
      <PageMeta
        icon={Cloud}
        title={t('Home settings')}
        actions={
          <>
            <ActionGroup
              type="mute"
              options={[
                {
                  href: `https://${window.location.host}`,
                  icon: Cloud,
                  label: t('Open website'),
                },
              ]}
            />
          </>
        }
        breadCrumbs={[
          { href: '/owner/profile', title: 'Personal data' },
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
          groupIndex={0}
        />
      )}

      <PublishOptions />
    </section>
  );
};

const PublishOptions = () => {
  const {
    mutate: publishStaticFiles,
    status: publishStatus,
    error: publishFileError,
  } = useStaticFiles().publish;

  return (
    <>
      <ErrorNotification error={publishFileError} />
      <Section
        title={
          <>
            <Cloud className="inline-block h-5 w-5" /> {t('Clear cache')}
          </>
        }
      >
        <p className="mb-2">
          {t(
            `Did your public cache get outdated? You can force a refresh of your public cache to attempt and fix the issues you may be having.`
          )}
        </p>
        <div className="flex flex-row-reverse">
          <ActionButton
            onClick={() => publishStaticFiles(undefined)}
            state={publishStatus}
            icon={Times}
            type="secondary"
          >
            {t('Clear cache')}
          </ActionButton>
        </div>
      </Section>
    </>
  );
};

export default Website;
