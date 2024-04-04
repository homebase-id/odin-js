import { useState } from 'react';

interface NavPillsProps {
  className?: string;
  items: { title: string; key: string; isActive: boolean; href?: string }[];
  onChange: (key: string) => void;
  disallowWrap?: boolean;
}

const NavPills = ({ className, items, onChange, disallowWrap }: NavPillsProps) => {
  const [offset, setOffset] = useState(-1);
  const [width, setWidth] = useState(-1);

  return (
    <ul
      className={`group relative flex flex-row gap-2 ${disallowWrap ? '' : 'flex-wrap'} ${
        className ?? ''
      } `}
    >
      <BgHoverEffectsBlock offset={offset} width={width} />
      {items.map((item) => (
        <li
          key={item.key}
          className="relative"
          onMouseEnter={(e) => {
            setOffset(e.currentTarget.offsetLeft);
            setWidth(e.currentTarget.children?.[0]?.clientWidth);
          }}
        >
          <a
            className={`block cursor-pointer select-none rounded-lg px-4 py-2 ${
              item.isActive ? 'bg-button text-white' : ''
            }`}
            onClick={(e) => {
              e.preventDefault();
              onChange(item.key);
            }}
            href={item.href}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
};

const BgHoverEffectsBlock = ({ offset, width }: { offset: number; width: number }) => {
  return (
    <span
      className="absolute bottom-0 left-0 top-0 hidden h-full flex-row transition-transform duration-100 group-hover:flex"
      style={{ transform: `translateX(${offset}px)` }}
    >
      <span className="absolute bottom-0 top-0 w-[8px] rounded-l-lg bg-button bg-opacity-20"></span>
      <span
        className="absolute bottom-0 top-0 w-[100px] origin-left bg-button bg-opacity-20"
        style={{ transform: `translateX(8px) scaleX(${(width - 16) / 100})` }}
      ></span>
      <span
        className="absolute bottom-0 top-0 w-[8px] rounded-r-lg bg-button bg-opacity-20"
        style={{ transform: `translateX(${((width - 8) / 100) * 100}px)` }}
      ></span>
    </span>
  );
};

export default NavPills;
