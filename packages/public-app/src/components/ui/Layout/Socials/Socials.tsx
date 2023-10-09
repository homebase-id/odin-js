import { UNLINKABLE_SOCIALS, getLink, getLinkIcon } from '../Links/Links';

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
            href={getLink(handle.type, handle.username)}
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
