import { FC } from 'react';

const Cloud: FC<IconProps> = ({ className }) => {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      className={`${className}`}
      viewBox="0 0 24 24"
    >
      {/* <path d="M8 17l4 4 4-4m-4-5v9"></path> */}
      <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"></path>
    </svg>
  );
};

export default Cloud;
