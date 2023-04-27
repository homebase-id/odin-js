import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface HybridLinkProps
  extends React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  > {
  children: ReactNode;
}

const HybridLink = (props: HybridLinkProps) => {
  const navigate = useNavigate();
  const onClickHandler =
    props?.onClick ||
    (props?.href?.startsWith('/owner')
      ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          props.href && navigate(props.href);
        }
      : undefined);

  return (
    <a {...props} onClick={onClickHandler}>
      {props.children}
    </a>
  );
};

export default HybridLink;
