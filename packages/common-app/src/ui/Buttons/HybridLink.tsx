import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface HybridLinkProps
  extends React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > {
  children: ReactNode;
}

export const HybridLink = (props: HybridLinkProps) => {
  const { pathname } = window.location;
  const isExternal = pathname.split('/')[1] !== (props.href || '/').split('/')[1];

  if (isExternal) return <a {...props}>{props.children}</a>;
  else {
    const navigate = useNavigate();
    const onClickHandler =
      props?.onClick ||
      ((e) => {
        e.preventDefault();
        e.stopPropagation();
        props.href && navigate(props.href);
      });

    return (
      <a {...props} onClick={onClickHandler}>
        {props.children}
      </a>
    );
  }
};
