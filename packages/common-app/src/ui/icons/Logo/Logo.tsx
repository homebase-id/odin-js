import { FC } from 'react';
import { IconProps } from '../Types';

export const Logo: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="711"
      height="711"
      viewBox="0 0 711 711"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
    >
      <circle cx="358.5" cy="355.5" r="331.5" fill="white" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M394 204C394 261.759 380.609 314.114 358.898 352.303C402.53 358.078 452.465 379.147 498.568 414.231C544.679 449.32 578.301 491.84 595.494 532.36C633.463 482.408 656 420.086 656 352.5C656 188.196 522.805 55.0002 358.5 55.0002C194.195 55.0002 61 188.196 61 352.5C61 420.139 83.5728 482.506 121.596 532.479C138.774 491.923 172.417 449.354 218.573 414.231C264.63 379.182 314.511 358.12 358.112 352.321C336.395 314.13 323 261.768 323 204C323 145.889 336.555 93.2478 358.5 55.0002C380.445 93.2478 394 145.889 394 204ZM358.4 352.825C341.178 393.278 307.595 435.707 261.568 470.732C215.412 505.855 165.416 526.933 121.748 532.679C176.097 603.983 261.925 650 358.5 650C455.083 650 540.916 603.976 595.264 532.662C551.627 526.892 501.683 505.821 455.572 470.732C409.492 435.666 375.885 393.179 358.681 352.684C358.621 352.789 358.56 352.895 358.5 353C358.467 352.942 358.433 352.883 358.4 352.825Z"
        fill="url(#paint0_linear_110_15)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M358 55C379.945 93.2475 393.5 145.889 393.5 204C393.5 261.759 380.109 314.114 358.398 352.303C402.03 358.077 451.965 379.147 498.068 414.23C544.179 449.32 577.801 491.84 594.994 532.36C632.963 482.407 655.5 420.086 655.5 352.5C655.5 188.195 522.305 55 358 55Z"
        fill="url(#paint1_linear_110_15)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M358.5 55C194.195 55 61 188.195 61 352.5C61 420.139 83.5728 482.506 121.596 532.479C138.774 491.923 172.417 449.354 218.573 414.23C264.629 379.182 314.511 358.119 358.112 352.32C336.395 314.13 323 261.768 323 204C323 145.889 336.555 93.2476 358.5 55Z"
        fill="url(#paint2_linear_110_15)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M261.115 471.048C307.239 436.023 340.893 393.594 358.151 353.141L358.252 353.316C358.312 353.211 358.373 353.106 358.433 353C375.673 393.495 409.352 435.982 455.529 471.048C501.737 506.137 551.787 527.208 595.516 532.978C541.053 604.292 455.039 650.316 358.252 650.316C261.472 650.316 175.464 604.299 121 532.995C164.76 527.249 214.862 506.171 261.115 471.048Z"
        fill="url(#paint3_linear_110_15)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_110_15"
          x1="507"
          y1="191"
          x2="208"
          y2="469.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C68CFF" />
          <stop offset="1" stopColor="#8CD9FF" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_110_15"
          x1="371.5"
          y1="182.396"
          x2="652.387"
          y2="342.962"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F0F0F0" stopOpacity="0.6" />
          <stop offset="1" stopColor="#D9D9D9" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_110_15"
          x1="279"
          y1="194.5"
          x2="102.041"
          y2="269.598"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F0F0F0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#D9D9D9" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_110_15"
          x1="371.852"
          y1="642.705"
          x2="344.701"
          y2="508.71"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F0F0F0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#D9D9D9" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};
