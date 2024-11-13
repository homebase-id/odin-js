import { FC } from 'react';
import { IconProps } from '../Icons/Types';

export const HomebaseChat: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="919"
      height="919"
      viewBox="0 0 919 919"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      <rect width="919" height="919" rx="80" fill="url(#paint0_linear_410_40)" />
      <path
        d="M718 443.857C718 559.783 602.511 653.714 460.015 653.714C422.627 653.714 387.154 647.257 355.108 635.654C343.115 644.432 323.565 656.438 300.387 666.528C276.201 677.021 247.076 686 218.154 686C211.604 686 205.759 682.065 203.239 676.012C200.72 669.958 202.131 663.097 206.666 658.456L206.968 658.154C207.27 657.851 207.673 657.447 208.278 656.741C209.386 655.53 211.1 653.613 213.216 650.99C217.348 645.945 222.89 638.479 228.534 629.197C238.611 612.449 248.185 590.454 250.1 565.736C219.867 531.432 202.03 489.36 202.03 443.857C202.03 327.931 317.519 234 460.015 234C602.511 234 718 327.931 718 443.857Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_410_40"
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
