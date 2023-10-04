import useBiography from '../../../../hooks/biography/useBiography';
import { Arrow, RichTextRenderer, t } from '@youfoundation/common-app';

const About = ({ className }: { className?: string }) => {
  const { data: bioData } = useBiography();

  return (
    <div className={className ?? ''}>
      <div className="-mx-2 flex max-w-6xl flex-col lg:flex-row xl:-mx-4">
        <div className="px-2 py-2 lg:w-2/3 xl:px-4">
          {bioData?.shortBio && (
            <p className="whitespace-pre-line pb-10">{bioData.shortBio.body}</p>
          )}
          {bioData?.experience ? (
            <div className="-my-5">
              {bioData.experience.map((experienceItem) => (
                <ExperienceBlock
                  title={experienceItem.title}
                  body={experienceItem.body}
                  link={experienceItem.link}
                  key={experienceItem.id}
                  className="my-5"
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
  className,
}: {
  title: string;
  body: string | Record<string, unknown>[];
  link?: string;
  className: string;
}) => {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-background px-8 py-12 ${className}`}>
      <h1 className="title-font mb-3 text-xl font-medium sm:text-2xl">{title}</h1>
      <RichTextRenderer className="leading-relaxe" body={body} />
      {link ? (
        <div className="flex flex-row-reverse">
          <a
            href={link.startsWith('http') ? link : `https://${link}`}
            className="flex flex-row items-center gap-1 text-primary"
          >
            {t('More')}
            <Arrow className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
};

export default About;
