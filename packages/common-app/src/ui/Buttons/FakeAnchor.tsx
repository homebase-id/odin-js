import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface FakeAnchorProps extends React.HTMLProps<HTMLAnchorElement> {
  children: ReactNode;
  preventScrollReset?: boolean;
  onNavigate?: () => void;
}

export const FakeAnchor = ({
  children,
  href,
  onNavigate,
  className,
  preventScrollReset,
  ...props
}: FakeAnchorProps) => {
  const navigate = useNavigate();
  const { pathname } = window.location;
  // Relative URLs are always considered internal
  const isExternal =
    href?.startsWith('/') && pathname.split('/')[1] !== (href || '/').split('/')[1];

  return (
    <span
      {...props}
      className={`${className ?? ''} ${href ? 'cursor-pointer' : ''}`}
      onClick={
        href
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!href.startsWith('http') && !isExternal) {
                navigate(href, { preventScrollReset: preventScrollReset });
                onNavigate && onNavigate();
              } else {
                window.location.href = href;
              }
            }
          : props.onClick
      }
      onAuxClick={
        href
          ? (e) => {
              if (e.button === 1) {
                e.preventDefault();
                window.open(href);
              }
            }
          : undefined
      }
      tabIndex={0}
      role="link"
    >
      {children}
    </span>
  );
};
