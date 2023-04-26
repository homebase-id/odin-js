const LoadingParagraph = ({ className = 'w-full h-2 m-0' }: { className?: string }) => {
  return (
    <div className={`${className} animate-pulse rounded bg-slate-100 dark:bg-slate-700`}></div>
  );
};

export default LoadingParagraph;
