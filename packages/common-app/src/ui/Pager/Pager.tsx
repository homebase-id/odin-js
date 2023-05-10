import { Triangle } from '../../ui';

interface PagerProps {
  totalPages: number;
  setPage: (page: number) => void;
  currentPage: number;
  className?: string;
}

export const Pager = ({ totalPages, setPage, currentPage, className }: PagerProps) => {
  if (currentPage === 1 && currentPage >= totalPages) {
    return null;
  }

  return (
    <div className={`flex text-slate-300 dark:text-slate-700 ${className ?? ''}`}>
      <div
        className={
          currentPage !== 1
            ? 'cursor-pointer text-slate-600 dark:text-slate-200'
            : 'pointer-events-none'
        }
        onClick={() => setPage(currentPage - 1)}
      >
        <Triangle className={`h-5 w-5 rotate-180`} />
      </div>
      <div
        className={
          currentPage < totalPages
            ? 'cursor-pointer text-slate-600 dark:text-slate-200'
            : 'pointer-events-none'
        }
        onClick={() => setPage(currentPage + 1)}
      >
        <Triangle className={`h-5 w-5`} />
      </div>
    </div>
  );
};
