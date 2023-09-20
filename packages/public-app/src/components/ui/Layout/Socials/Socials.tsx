import { SocialFields } from '@youfoundation/js-lib/profile';
import { UNLINKABLE_SOCIALS, getLinkIcon } from '../Links/Links';

const Socials = ({
  socialHandles,
  className,
}: {
  socialHandles?: { type: string; username: string }[];
  className: string;
}) => {
  return (
    <span className={`inline-flex ${className}`}>
      {socialHandles
        ?.filter((handle) => !UNLINKABLE_SOCIALS.includes(handle.type))
        .map((handle, index) => (
          <a
            className="ml-3 text-gray-500"
            href={
              handle.type !== SocialFields.Homebase
                ? `https://${handle.type}.com/${
                    handle.type === SocialFields.LinkedIn ? 'in/' : ''
                  }${handle.username}`
                : `https://${handle.username}`
            }
            target="_blank"
            rel="noreferrer noopener"
            key={index}
          >
            {getLinkIcon(handle.type)({ className: 'w-5 h-5' })}
          </a>
        ))}
    </span>
  );
};

export default Socials;
