import { FC } from 'react';
import { IconProps } from '../Icons/Types';

export const HomebaseMail: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="919"
      height="919"
      viewBox="0 0 919 919"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      <path
        d="M248.75 265C221.836 265 200 286.836 200 313.75C200 329.086 207.211 343.508 219.5 352.75L440.5 518.5C452.078 527.133 467.922 527.133 479.5 518.5L700.5 352.75C712.789 343.508 720 329.086 720 313.75C720 286.836 698.164 265 671.25 265H248.75ZM200 378.75V590C200 625.852 229.148 655 265 655H655C690.852 655 720 625.852 720 590V378.75L499 544.5C475.844 561.868 444.156 561.868 421 544.5L200 378.75Z"
        fill="url(#paint0_linear_416_2)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M459.5 919C713.275 919 919 713.275 919 459.5C919 205.726 713.275 0.000488281 459.5 0.000488281C205.725 0.000488281 0 205.726 0 459.5C0 713.275 205.725 919 459.5 919ZM459.5 877C690.079 877 877 690.079 877 459.5C877 228.922 690.079 42.0005 459.5 42.0005C228.921 42.0005 42 228.922 42 459.5C42 690.079 228.921 877 459.5 877Z"
        fill="url(#paint1_linear_416_2)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_416_2"
          x1="583.5"
          y1="257.5"
          x2="323"
          y2="628.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C68CFF" />
          <stop offset="1" stopColor="#8CD9FF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_416_2"
          x1="583.5"
          y1="257.5"
          x2="323"
          y2="628.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C68CFF" />
          <stop offset="1" stopColor="#8CD9FF" />
        </linearGradient>
      </defs>
    </svg>
  );
};
