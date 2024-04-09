import { Cog } from '@youfoundation/common-app';

const LinkToConsole = ({ className }: { className: string }) => {
  return (
    <a
      href="/owner"
      className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 ${
        className ?? ''
      }`}
    >
      <Cog className="h-5 w-5" />
    </a>
  );
};

export default LinkToConsole;
