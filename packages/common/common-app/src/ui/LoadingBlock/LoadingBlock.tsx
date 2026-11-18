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
        className.indexOf('bg-') === -1 ? 'bg-surface-container-highest' : ''
      }`}
      style={style}
    ></div>
  );
};
