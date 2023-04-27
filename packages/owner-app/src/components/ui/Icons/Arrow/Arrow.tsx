import { FC } from 'react';

const Arrow: FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14"></path>
      <path d="M12 5l7 7-7 7"></path>
    </svg>
  );
};

export const ArrowUp: FC<IconProps> = ({ className }) => {
  return <Arrow className={`-rotate-90 ${className ?? ''}`} />;
};

export const ArrowDown: FC<IconProps> = ({ className }) => {
  return <Arrow className={`rotate-90 ${className ?? ''}`} />;
};

export const ArrowLeft: FC<IconProps> = ({ className }) => {
  return <Arrow className={`rotate-180 ${className ?? ''}`} />;
};

export default Arrow;
