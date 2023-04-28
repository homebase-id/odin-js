import { Tiktok, Instagram, Facebook, Twitter, Linkedin, Person } from '@youfoundation/common-app';

const Socials = ({
  socialHandles,
  className,
}: {
  socialHandles?: { type: string; username: string }[];
  className: string;
}) => {
  return (
    <span className={`inline-flex ${className}`}>
      {socialHandles?.map((handle, index) => (
        <a
          className="ml-3 text-gray-500"
          href={
            handle.type !== 'dotyouid'
              ? `https://${handle.type}.com/${handle.username}`
              : `https://${handle.username}`
          }
          target="_blank"
          rel="noreferrer noopener"
          key={index}
        >
          {handle.type === 'tiktok' ? (
            <Tiktok className="h-5 w-5" />
          ) : handle.type === 'instagram' ? (
            <Instagram className="h-5 w-5" />
          ) : handle.type === 'facebook' ? (
            <Facebook className="h-5 w-5" />
          ) : handle.type === 'twitter' ? (
            <Twitter className="h-5 w-5" />
          ) : handle.type === 'linkedin' ? (
            <Linkedin className="h-5 w-5" />
          ) : handle.type === 'dotyouid' ? (
            <Person className="h-5 w-5" />
          ) : null}
        </a>
      ))}
    </span>
  );
};

export default Socials;
