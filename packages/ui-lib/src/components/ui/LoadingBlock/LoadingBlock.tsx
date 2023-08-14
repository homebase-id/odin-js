const LoadingBlock = ({ className = 'w-full h-2 m-0' }: { className?: string }) => {
  return (
    <div className={`${className} animate-pulse rounded bg-slate-200 dark:bg-slate-700`}></div>
  );
};

export default LoadingBlock;
