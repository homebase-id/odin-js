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
  const isExternal = pathname.split('/')[1] !== (href || '/').split('/')[1];

  return (
    <span
      {...props}
      className={`${className ?? ''} ${href ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (href) {
          if (!href.startsWith('http') && !isExternal) {
            navigate(href, { preventScrollReset: preventScrollReset });
            onNavigate && onNavigate();
          } else {
            window.location.href = href;
          }
        }
      }}
      tabIndex={0}
      role="link"
    >
      {children}
    </span>
  );
};
