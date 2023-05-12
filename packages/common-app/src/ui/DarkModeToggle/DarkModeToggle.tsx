import { FC } from 'react';

import './darkModeToggle.css';
import { useDarkMode, Sun, Moon } from '../../..';

interface DarkModeToggleProps {
  className?: string;
}

export const DarkModeToggle: FC<DarkModeToggleProps> = ({ className }) => {
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
