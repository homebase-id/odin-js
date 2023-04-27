import { FC } from 'react';

import './Loader.css';

const Loader: FC<IconProps> = ({ className }) => {
  return (
    <div className={`loader ${className}`}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};

export default Loader;
