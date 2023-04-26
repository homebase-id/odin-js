import { FC } from 'react';

interface ShieldProps extends IconProps {
  fill?: 'currentColor';
}

const Shield: FC<ShieldProps> = ({ className, fill }) => {
  return (
    <svg
      fill={fill ?? 'none'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={'2'}
      className={`${className}`}
      viewBox="0 0 24 24"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  );
};

export default Shield;
