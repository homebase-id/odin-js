import { FC, ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Select } from '@youfoundation/common-app';
import { LoadingParagraph } from '@youfoundation/common-app';

interface SubmenuProps {
  className?: string;
  items: { title: ReactNode; text?: string; key: string; path: string; className?: string }[];
  isLoading?: boolean;
}

const Submenu: FC<SubmenuProps> = ({ className, items, isLoading }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const forceMobileView = items?.length >= 6;

  if (isLoading === true) {
    return <LoadingParagraph className="h-10" />;
  }

  // True when no items match the current location; Forces a fallback to an active state on the first item
  const activeFallback = !items.some((item) => item.path === location.pathname);

  return (
    <>
      <div
        className={`hidden flex-col flex-wrap ${!forceMobileView ? 'sm:flex' : ''} sm:flex-row ${
          className ?? ''
        }`}
      >
        {items.map((item, index) => {
          return (
            // Only NavLink Supports isActive styling https://reactrouter.com/docs/en/v6/components/nav-link
            <NavLink
              className={({ isActive }) =>
                `${
                  item.className && item.className?.indexOf('flex-grow') !== -1 ? '' : 'flex-grow'
                } cursor-pointer border-b-2 px-1 py-2 text-lg ${
                  isActive || (activeFallback && index === 0)
                    ? 'border-indigo-500 text-indigo-500 dark:text-indigo-400'
                    : 'border-gray-300 transition-colors duration-300 hover:border-indigo-400 dark:border-gray-800 hover:dark:border-indigo-600'
                } ${item.className ?? ''}`
              }
              to={item.path}
              key={item.key}
              end
            >
              {item.title}
            </NavLink>
          );
        })}
      </div>
      <Select
        className={`${!forceMobileView ? 'sm:hidden' : ''} py-4`}
        onChange={(e) => navigate(e.target.value)}
        value={window.location.pathname}
      >
        {items.map((item) => {
          return (
            <option key={item.key} value={item.path}>
              {item.text || item.title}
            </option>
          );
        })}
      </Select>
    </>
  );
};

export default Submenu;
