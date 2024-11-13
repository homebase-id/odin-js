import { useSocials } from '@homebase-id/common-app';

const Socials = ({ className }: { className: string }) => {
  const { data: socials } = useSocials();

  return (
    <span className={`inline-flex ${className}`}>
      {socials
        ?.filter((link) => !!link.link)
        .map((socialLink, index) => (
          <a
            className="ml-3 text-gray-500 hover:text-primary"
            href={socialLink.link}
            target="_blank"
            rel="noreferrer noopener"
            key={index}
          >
            {socialLink.icon({ className: 'w-5 h-5' })}
            <span className="sr-only">{socialLink.copyText}</span>
          </a>
        ))}
    </span>
  );
};

export default Socials;
