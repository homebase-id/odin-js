import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export interface HybridLinkProps
  extends React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > {
  children: ReactNode;
}

export const HybridLink = (props: HybridLinkProps) => {
  const { pathname } = window.location;
  const firstPathPart = pathname.split('/')[1];
  const firstHrefPart = (props.href || '/').split('/')[1];

  // If both are "owner", or neither is "owner", it's internal, otherwise external
  const isExternal =
    !(
      (firstPathPart === 'owner' && firstHrefPart === 'owner') ||
      (firstPathPart !== 'owner' && firstHrefPart !== 'owner')
    ) || props.href?.startsWith('http');

  if (isExternal)
    return (
      <a {...props} onClick={props.onClick || ((e) => e.stopPropagation())} data-external>
        {props.children}
      </a>
    );
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
      <a
        {...props}
        onClick={onClickHandler}
        data-internal
        className={`${props.className || ''} ${
          props?.onClick || props.href ? 'cursor-pointer' : ''
        }`}
      >
        {props.children}
      </a>
    );
  }
};
