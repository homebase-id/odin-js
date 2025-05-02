import {
  LoadingBlock,
  RichTextRenderer,
  t,
  useBiography,
  useOdinClientContext,
} from '@homebase-id/common-app';
import { OdinImage } from '@homebase-id/ui-lib';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { CompanyImage } from '../../../components/Connection/CompanyImage/CompanyImage';
import { Arrow } from '@homebase-id/common-app/icons';
import Section from '../../../components/ui/Sections/Section';

export const ConnectionDetailsAbout = ({ odinId }: { odinId: string }) => {
  const { data: bioData, isLoading } = useBiography({ odinId });

  return (
    <Section className="flex flex-col gap-10">
      {isLoading ? <LoadingBlock className="h-16" /> : null}

      {bioData?.bioData && (
        <RichTextRenderer className="leading-relaxed" body={bioData.bioData.body} />
      )}
      {bioData?.experience ? (
        <div className="flex flex-col gap-5">
          {bioData.experience.map((experienceItem) => (
            <ExperienceBlock
              odinId={odinId}
              title={experienceItem.title}
              body={experienceItem.body}
              link={experienceItem.link}
              imageFileId={experienceItem.imageFileId}
              imageFileKey={experienceItem.imageFileKey}
              lastModified={experienceItem.lastModified}
              key={experienceItem.id}
            />
          ))}
        </div>
      ) : null}
    </Section>
  );
};

const ExperienceBlock = ({
  odinId,
  title,
  body,
  link,
  imageFileId,
  imageFileKey,
  lastModified,
  className,
}: {
  odinId: string;
  title: string;
  body: string | Record<string, unknown>[];
  link?: string;
  imageFileId?: string;
  imageFileKey?: string;
  lastModified: number | undefined;
  className?: string;
}) => {
  const odinClient = useOdinClientContext();
  const domain = link ? new URL(link).hostname : undefined;

  return (
    <div
      className={`relative flex flex-row gap-2 overflow-hidden rounded-lg bg-background px-5 py-8 sm:gap-4 sm:px-8 sm:py-12 ${className}`}
    >
      {imageFileId ? (
        <OdinImage
          odinClient={odinClient}
          odinId={odinId}
          targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
          fileId={imageFileId}
          fileKey={imageFileKey}
          lastModified={lastModified}
          fit="contain"
          className="relative aspect-square w-1/6 flex-shrink-0 flex-grow-0"
        />
      ) : domain ? (
        <div className="w-1/6 flex-shrink-0 flex-grow-0">
          <CompanyImage domain={domain} />
        </div>
      ) : null}
      <div className="flex-grow">
        <h1 className="title-font mb-3 text-xl font-medium sm:text-2xl">{title}</h1>
        <RichTextRenderer className="leading-relaxed" body={body} />
        {link ? (
          <div className="flex flex-row-reverse">
            <a
              href={link.startsWith('http') ? link : `https://${link}`}
              target="_blank"
              className="flex flex-row items-center gap-1 text-primary"
              rel="noreferrer"
            >
              {t('Link')}
              <Arrow className="h-5 w-5" />
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
};
