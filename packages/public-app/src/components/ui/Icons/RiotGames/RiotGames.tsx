import { FC } from 'react';

const RiotGames: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="290"
      height="270"
      viewBox="0 0 290 270"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className}`}
      fill="currentColor"
    >
      <path
        d="M162.284 0.423065L0 75.6138L40.4355 229.579L71.2099 225.798L62.7482 128.99L72.853 124.486L90.3022 223.447L142.896 216.987L133.547 110.135L143.554 105.68L162.744 214.554L215.946 208.011L205.71 90.8853L215.831 86.3811L236.813 205.447L289.407 198.986V32.2813L162.284 0.423065ZM166.096 233.935L168.774 249.092L289.407 269.213V218.779L166.162 233.935H166.096Z"
        fill="inherit"
      />
    </svg>
  );
};

export default RiotGames;
