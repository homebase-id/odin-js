import { FC } from 'react';

const Moon: FC<IconProps> = ({ className }) => {
  return (
    <svg
      fill="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="0"
      className={`${className}`}
      viewBox="0 0 24 24"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path>
    </svg>
  );
};

export default Moon;
