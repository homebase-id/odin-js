import { FC } from 'react';

import { IconProps } from './Types';

export const CoverPage: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="398"
      height="280"
      viewBox="0 0 398 280"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="243" y="32" width="72" height="11" fill="currentColor" />
      <rect x="243" y="50" width="135" height="6" fill="currentColor" />
      <rect x="243" y="61" width="135" height="6" fill="currentColor" />
      <rect x="243" y="72" width="135" height="6" fill="currentColor" />
      {/* <rect x="243" y="110" width="135" height="58" fill="currentColor" /> */}
      {/* <rect x="243" y="178" width="135" height="58" fill="currentColor" /> */}
      <rect x="16" y="15" width="216" height="239" fill="currentColor" />
    </svg>
  );
};

export const HorizontalPosts: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="398"
      height="520"
      viewBox="0 0 398 520"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="16" y="13" width="363" height="115" fill="currentColor" />
      <rect x="16" y="179" width="97" height="58" fill="currentColor" />
      <rect x="123" y="179" width="97" height="58" fill="currentColor" />
      <rect x="230" y="179" width="97" height="58" fill="currentColor" />
      <rect x="337" y="179" width="42" height="58" fill="currentColor" />
      <rect x="16" y="283" width="97" height="58" fill="currentColor" />
      <rect x="16" y="265" width="69" height="11" fill="currentColor" />
      <rect x="16" y="161" width="69" height="11" fill="currentColor" />
      <rect x="123" y="283" width="97" height="58" fill="currentColor" />
      <rect x="230" y="283" width="97" height="58" fill="currentColor" />
      <rect x="337" y="283" width="42" height="58" fill="currentColor" />
      <rect x="16" y="387" width="97" height="58" fill="currentColor" />
      <rect x="16" y="369" width="69" height="11" fill="currentColor" />
      <rect x="123" y="387" width="97" height="58" fill="currentColor" />
      <rect x="230" y="387" width="97" height="58" fill="currentColor" />
      <rect x="337" y="387" width="42" height="58" fill="currentColor" />
      <circle cx="59" cy="82" r="32" fill="white" />
    </svg>
  );
};

export const VerticalPosts: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="398"
      height="520"
      viewBox="0 0 398 520"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="16" y="138" width="243" height="115" fill="currentColor" />
      <rect x="16" y="13" width="363" height="115" fill="currentColor" />
      <rect x="269" y="138" width="110" height="58" fill="currentColor" />
      <rect x="269" y="206" width="110" height="58" fill="currentColor" />
      <rect x="16" y="263" width="243" height="115" fill="currentColor" />
      <rect x="16" y="388" width="243" height="115" fill="currentColor" />
      <circle cx="59" cy="82" r="32" fill="white" />
    </svg>
  );
};

export const Links: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="398"
      height="416"
      viewBox="0 0 398 416"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="398" height="416" />
      <rect x="16" y="138" width="243" height="20" fill="currentColor" />
      <rect x="16" y="168" width="243" height="20" fill="currentColor" />
      <rect x="16" y="198" width="243" height="20" fill="currentColor" />
      <rect x="16" y="228" width="243" height="20" fill="currentColor" />
      <rect x="16" y="258" width="243" height="20" fill="currentColor" />
      <rect x="16" y="288" width="243" height="20" fill="currentColor" />
      <rect x="16" y="318" width="243" height="20" fill="currentColor" />
      <rect x="16" y="348" width="243" height="20" fill="currentColor" />
      <rect x="16" y="378" width="243" height="20" fill="currentColor" />
      <rect x="16" y="13" width="363" height="115" fill="currentColor" />
      <circle cx="59" cy="82" r="32" fill="white" />
    </svg>
  );
};

export const PosterCard: FC<IconProps> = ({ className }) => (
  <svg
    width="280"
    height="398"
    viewBox="0 0 280 398"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="10" y="10" width="260" height="378" rx="18" fill="currentColor" fillOpacity="0.35" />
    <rect x="34" y="230" width="150" height="26" fill="currentColor" />
    <rect x="34" y="262" width="110" height="26" fill="currentColor" />
    <rect x="34" y="310" width="212" height="4" fill="currentColor" />
    <rect x="34" y="340" width="212" height="4" fill="currentColor" />
  </svg>
);

export const BoardCard: FC<IconProps> = ({ className }) => (
  <svg
    width="280"
    height="398"
    viewBox="0 0 280 398"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="140" cy="80" r="46" fill="currentColor" />
    <rect x="70" y="140" width="140" height="16" fill="currentColor" />
    <rect x="34" y="180" width="212" height="40" rx="8" fill="currentColor" />
    <rect x="34" y="232" width="212" height="40" rx="8" fill="currentColor" />
    <rect x="34" y="284" width="212" height="40" rx="8" fill="currentColor" />
  </svg>
);

export const CollageCard: FC<IconProps> = ({ className }) => (
  <svg
    width="280"
    height="398"
    viewBox="0 0 280 398"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="24" y="30" width="120" height="140" transform="rotate(-5 84 100)" fill="currentColor" />
    <ellipse cx="206" cy="96" rx="52" ry="64" fill="currentColor" fillOpacity="0.6" />
    <path
      d="M40 230c20-30 40 30 60 0s40 30 60 0 40 30 60 0"
      stroke="currentColor"
      strokeWidth="12"
      fill="none"
    />
    <rect x="34" y="310" width="150" height="50" rx="14" fill="currentColor" />
    <circle cx="222" cy="335" r="26" fill="currentColor" />
  </svg>
);

export const DossierCard: FC<IconProps> = ({ className }) => (
  <svg
    width="280"
    height="398"
    viewBox="0 0 280 398"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="24" y="24" width="64" height="64" fill="currentColor" />
    <rect x="104" y="30" width="140" height="20" fill="currentColor" />
    <rect x="104" y="58" width="100" height="20" fill="currentColor" />
    {[130, 170, 210, 270, 310].map((y) => (
      <rect key={y} x="24" y={y} width="232" height="3" fill="currentColor" />
    ))}
  </svg>
);
