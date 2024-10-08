import { FC } from 'react';
import { IconProps } from '../Icons/Types';

export const HomebaseFeed: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="919"
      height="919"
      viewBox="0 0 919 919"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      <rect width="919" height="919" rx="80" fill="url(#paint0_linear_430_2)" />
      <path
        d="M202 238.897C202 218.489 218.489 202 238.897 202C503.866 202 718.561 416.695 718.561 681.664C718.561 702.073 702.073 718.561 681.664 718.561C661.255 718.561 644.767 702.073 644.767 681.664C644.767 457.514 463.048 275.794 238.897 275.794C218.489 275.794 202 259.306 202 238.897ZM202 644.767C202 625.195 209.774 606.426 223.613 592.587C237.454 578.748 256.223 570.972 275.794 570.972C295.366 570.972 314.136 578.748 327.975 592.587C341.814 606.426 349.589 625.195 349.589 644.767C349.589 664.339 341.814 683.108 327.975 696.948C314.136 710.787 295.366 718.561 275.794 718.561C256.223 718.561 237.454 710.787 223.613 696.948C209.774 683.108 202 664.339 202 644.767ZM238.897 349.589C422.345 349.589 570.972 498.216 570.972 681.664C570.972 702.073 554.484 718.561 534.075 718.561C513.667 718.561 497.178 702.073 497.178 681.664C497.178 539.033 381.528 423.384 238.897 423.384C218.489 423.384 202 406.895 202 386.487C202 366.077 218.489 349.589 238.897 349.589Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_430_2"
          x1="795.951"
          y1="986.767"
          x2="375.677"
          y2="-58.4083"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.265" stopColor="#191272" />
          <stop offset="1" stopColor="#ED0342" />
        </linearGradient>
      </defs>
    </svg>
  );
};
