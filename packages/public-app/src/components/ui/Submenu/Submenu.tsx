import { FC, ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

interface SubmenuProps {
  className?: string;
  items: { title: ReactNode; text?: string; key: string; path: string; className?: string }[];
}

const Submenu: FC<SubmenuProps> = ({ className, items }) => {
  const navigate = useNavigate();
  const forceMobileView = items?.length >= 6;

  return (
    <>
      <div
        className={`hidden flex-col flex-wrap ${!forceMobileView ? 'sm:flex' : ''} sm:flex-row ${
          className ?? ''
        }`}
      >
        {items.map((item) => {
          return (
            // Only NavLink Supports isActive styling https://reactrouter.com/docs/en/v6/components/nav-link
            <NavLink
              className={({ isActive }) =>
                `flex-grow cursor-pointer border-b-2 py-2 px-1 text-lg ${
                  isActive
                    ? 'border-button text-button'
                    : 'border-gray-300 transition-colors duration-300 hover:border-button hover:border-opacity-50 dark:border-gray-800'
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
      <select
        className={`${
          !forceMobileView ? 'sm:hidden' : ''
        } mb-8 w-full rounded border border-gray-300 bg-white py-4 px-3 text-base leading-8 text-gray-700 outline-none transition-colors duration-200 ease-in-out focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
        onChange={(e) => navigate(e.target.value)}
        defaultValue={window.location.pathname}
      >
        {items.map((item) => {
          return (
            <option key={item.key} value={item.path}>
              {item.text || item.title}
            </option>
          );
        })}
      </select>
    </>
  );
};

export default Submenu;
