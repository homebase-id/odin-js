import { Tiktok, Instagram, Facebook, Twitter, Linkedin, Person } from '@youfoundation/common-app';
import { SocialFields } from '@youfoundation/js-lib/profile';

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
            handle.type !== SocialFields.Homebase
              ? `https://${handle.type}.com/${handle.type === SocialFields.LinkedIn ? 'in/' : ''}${
                  handle.username
                }`
              : `https://${handle.username}`
          }
          target="_blank"
          rel="noreferrer noopener"
          key={index}
        >
          {handle.type === SocialFields.Tiktok ? (
            <Tiktok className="h-5 w-5" />
          ) : handle.type === SocialFields.Instagram ? (
            <Instagram className="h-5 w-5" />
          ) : handle.type === SocialFields.Facebook ? (
            <Facebook className="h-5 w-5" />
          ) : handle.type === SocialFields.Twitter ? (
            <Twitter className="h-5 w-5" />
          ) : handle.type === SocialFields.LinkedIn ? (
            <Linkedin className="h-5 w-5" />
          ) : handle.type === SocialFields.Homebase ? (
            <Person className="h-5 w-5" />
          ) : null}
        </a>
      ))}
    </span>
  );
};

export default Socials;
