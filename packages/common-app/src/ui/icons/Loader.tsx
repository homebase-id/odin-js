import { FC } from 'react';

import './Loader.css';

import { IconProps } from './Types';

export const Loader: FC<IconProps> = ({ className }) => {
  return (
    <div className={`loader ${className}`}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};
