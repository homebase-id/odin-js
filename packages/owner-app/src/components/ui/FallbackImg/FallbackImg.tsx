const FallbackImg = ({ initials, className }: { initials: string; className?: string }) => {
  return (
    <div
      className={`flex bg-slate-200 text-4xl font-light text-white dark:bg-slate-700 dark:text-black sm:text-6xl ${
        className ?? ''
      } ${className?.includes('h-') ? '' : 'h-full'} ${className?.includes('w-') ? '' : 'w-full'}`}
    >
      <span className="m-auto uppercase">{initials}</span>
    </div>
  );
};

export default FallbackImg;
