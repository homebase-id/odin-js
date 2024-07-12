export const LoadingBlock = ({
  className = 'w-full h-2 m-0',
  style,
}: {
  className?: string;
  style?: React.CSSProperties | undefined;
}) => {
  return (
    <div
      className={`${className} animate-pulse rounded ${
        className.indexOf('bg-') === -1 ? 'bg-slate-100 dark:bg-slate-700' : ''
      }`}
      style={style}
    ></div>
  );
};
