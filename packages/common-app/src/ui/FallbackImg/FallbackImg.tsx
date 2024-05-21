export const FallbackImg = ({
  initials,
  className,
  size,
}: {
  initials: string;
  className?: string;
  size?: 'xs' | 'md' | 'none';
}) => {
  return (
    <div
      className={`flex bg-slate-100 font-light text-black dark:bg-slate-700 dark:text-white ${
        size === 'xs'
          ? 'text-sm'
          : size === 'md'
            ? 'text-3xl'
            : size !== 'none'
              ? 'text-6xl sm:text-8xl'
              : ''
      } ${className ?? ''} ${className?.includes('h-') ? '' : 'h-full'} ${
        className?.includes('w-') ? '' : 'w-full'
      }`}
    >
      <span className="m-auto uppercase">{initials}</span>
    </div>
  );
};
