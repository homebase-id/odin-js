import { FallbackImg, RichTextRenderer, t, Image, useBiography } from '@homebase-id/common-app';
import { useState } from 'react';
import { BuiltInProfiles, GetTargetDriveFromProfileId } from '@homebase-id/js-lib/profile';
import { Arrow } from '@homebase-id/common-app/icons';

const About = ({ className }: { className?: string }) => {
  const { data: bioData } = useBiography();
  return (
    <div className={className ?? ''}>
      <div className="flex max-w-7xl flex-col gap-2 lg:flex-row xl:gap-4">
        <div className="py-2 lg:w-2/3">
          {bioData?.bioData && (
            <RichTextRenderer className="pb-10 leading-relaxed" body={bioData.bioData.body} />
          )}
          {bioData?.experience ? (
            <div className="flex flex-col gap-5">
              {bioData.experience.map((experienceItem) => (
                <ExperienceBlock
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
        </div>
      </div>
    </div>
  );
};

const ExperienceBlock = ({
  title,
  body,
  link,
  imageFileId,
  imageFileKey,
  lastModified,
  className,
}: {
  title: string;
  body: string | Record<string, unknown>[];
  link?: string;
  imageFileId?: string;
  imageFileKey?: string;
  lastModified: number | undefined;
  className?: string;
}) => {
  const domain = link ? new URL(link).hostname : undefined;

  return (
    <div
      className={`relative flex flex-row gap-2 overflow-hidden rounded-lg bg-background px-5 py-8 sm:gap-4 sm:px-8 sm:py-12 ${className || ''}`}
    >
      {imageFileId ? (
        <Image
          targetDrive={GetTargetDriveFromProfileId(BuiltInProfiles.StandardProfileId)}
          fileId={imageFileId}
          fileKey={imageFileKey}
          lastModified={lastModified}
          fit="contain"
          className="relative aspect-square w-1/6 flex-shrink-0 flex-grow-0"
        />
      ) : domain ? (
        <div className="w-1/6 flex-shrink-0 flex-grow-0">
          <ExternalLinkImage domain={domain} />
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

// Similar to CompanyImage, duplicated as it has a different goal
const ExternalLinkImage = ({ domain, className }: { domain: string; className?: string }) => {
  const [hasFailed, setHasFailed] = useState<boolean>(false);

  const bgClass = 'bg-white dark:bg-black';

  return (
    <div className={`relative z-0 aspect-square ${className || ''}`}>
      <FallbackImg odinId={domain} className={'absolute inset-0 flex aspect-square w-full'} />
      {/* On failed we fully hide the picture element, only visually hiding it, stays on top for safari...  */}
      {!hasFailed ? (
        <picture className={`relative z-10`}>
          {/* <source srcSet={`https://${domain}/pub/image`} /> */}
          <img
            src={`https://${domain}/favicon.ico`}
            className={`m-auto h-full w-full object-scale-down object-center ${bgClass}`}
            alt={domain}
            onError={() => setHasFailed(true)}
          />
        </picture>
      ) : null}
    </div>
  );
};

export default About;
