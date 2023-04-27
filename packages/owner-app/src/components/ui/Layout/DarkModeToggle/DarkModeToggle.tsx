import { FC } from 'react';
import useDarkMode from '../../../../hooks/useDarkMode';
import Moon from '../../Icons/Moon/Moon';
import Sun from '../../Icons/Sun/Sun';

import './darkModeToggle.css';

interface DarkModeToggleProps {
  className?: string;
}

const DarkModeToggle: FC<DarkModeToggleProps> = ({ className }) => {
  const { toggleDarkMode } = useDarkMode();

  return <button className={`mode ${className}`} onClick={toggleDarkMode}></button>;
};

export const MiniDarkModeToggle: FC<DarkModeToggleProps> = ({ className }) => {
  const { toggleDarkMode, isDarkMode } = useDarkMode();

  return (
    <span onClick={() => toggleDarkMode()} className={className}>
      {isDarkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
    </span>
  );
};

export default DarkModeToggle;
