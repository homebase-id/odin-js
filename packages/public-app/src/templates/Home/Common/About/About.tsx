import { ReactNode } from 'react';
import useBiography from '../../../../hooks/biography/useBiography';

const About = ({ className }: { className?: string }) => {
  const { data: bioData } = useBiography();

  return (
    <div className={className ?? ''}>
      <div className="-mx-2 flex max-w-6xl flex-col lg:flex-row xl:-mx-4">
        <div className="px-2 py-2 lg:w-2/3 xl:px-4">
          {bioData?.shortBio && <p className="pb-10">{bioData.shortBio.body}</p>}
          {bioData?.longBio ? (
            <div className="-my-5">
              {bioData.longBio.map((bioItem) => (
                <BiographyBlock
                  title={bioItem.title}
                  children={bioItem.body}
                  key={bioItem.id}
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

const BiographyBlock = ({
  title,
  children,
  className,
}: {
  title: string;
  children: string | ReactNode;
  className: string;
}) => {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-background px-8 py-12 ${className}`}>
      <h1 className="title-font mb-3 text-xl font-medium sm:text-2xl">{title}</h1>
      <p className="leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
        {children}
      </p>
    </div>
  );
};

export default About;
