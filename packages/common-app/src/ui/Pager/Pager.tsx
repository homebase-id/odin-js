import { t } from '../../helpers';
import { Triangle } from '../../ui/Icons';

interface PagerProps {
  totalPages: number;
  setPage: (page: number) => void;
  currentPage: number;
  className?: string;
  size?: 'xl';
}

export const Pager = ({ totalPages, setPage, currentPage, className, size }: PagerProps) => {
  if (currentPage === 1 && currentPage >= totalPages) return null;

  return (
    <div className={`flex text-slate-300 dark:text-slate-700 ${className ?? ''}`}>
      <div
        className={`flex flex-row gap-2 items-center ${
          currentPage !== 1
            ? 'cursor-pointer text-slate-600 dark:text-slate-200'
            : 'pointer-events-none'
        }`}
        onClick={() => setPage(currentPage - 1)}
      >
        <Triangle className={`h-5 w-5 rotate-180`} />
        {size === 'xl' && <span className="ml-2">{t('Previous')}</span>}
      </div>
      <div
        className={`flex flex-row gap-2 items-center ${
          currentPage < totalPages
            ? 'cursor-pointer text-slate-600 dark:text-slate-200'
            : 'pointer-events-none'
        }`}
        onClick={() => setPage(currentPage + 1)}
      >
        {size === 'xl' && <span className="ml-2">{t('Next')}</span>}
        <Triangle className={`h-5 w-5`} />
      </div>
    </div>
  );
};
