import { Link } from 'react-router-dom';
import { HOME_ROOT_PATH, ellipsisAtMaxChar } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';

const Breadcrumbs = ({
  levels,
  className,
}: {
  levels?: { title: string; href?: string }[];
  className?: string;
}) => {
  if (!levels) {
    return null;
  }

  return (
    <ul className={`mb-2 hidden flex-row lg:flex ${className ?? ''}`}>
      <li className="mr-2">
        <Link to={HOME_ROOT_PATH}>
          <span className="hover:underline">{t('Home')}</span>
          <span className="ml-2">{'>'}</span>
        </Link>
      </li>
      {levels.map((crumb, index) => {
        return (
          <li key={index} className="mr-2">
            {crumb.href ? (
              <Link to={crumb.href}>
                <span className="hover:underline">{ellipsisAtMaxChar(crumb.title, 20)}</span>
                <span className="ml-2">{'>'}</span>
              </Link>
            ) : (
              <span className="text-slate-500">{ellipsisAtMaxChar(crumb.title, 20)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default Breadcrumbs;
