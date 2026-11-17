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

  const open = () => {
    if (!href) return;
    if (!href.startsWith('http') && !isExternal) {
      navigate(href, { preventScrollReset: preventScrollReset });
      onNavigate && onNavigate();
    } else {
      window.location.href = href;
    }
  };

  return (
    <span
      {...props}
      className={`${className ?? ''} ${href ? 'cursor-pointer' : ''}`}
      onClick={
        href
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              open();
            }
          : props.onClick
      }
      // Enter opens it, as on a link; only when it has focus itself, not a link or button inside
      onKeyDown={
        href
          ? (e) => {
              if (e.key !== 'Enter' || e.target !== e.currentTarget) return;
              e.preventDefault();
              open();
            }
          : props.onKeyDown
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
