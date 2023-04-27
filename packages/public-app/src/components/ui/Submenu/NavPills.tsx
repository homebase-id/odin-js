interface NavPillsProps {
  className?: string;
  items: { title: string; key: string; isActive: boolean }[];
  onChange: (key: string) => void;
  disallowWrap?: boolean;
}

const NavPills = ({ className, items, onChange, disallowWrap }: NavPillsProps) => {
  return (
    <ul className={`-m-2 flex flex-row ${disallowWrap ? '' : 'flex-wrap'} ${className ?? ''} `}>
      {items.map((item) => (
        <li key={item.key} className="p-2">
          <a
            className={`block cursor-pointer select-none rounded-lg px-4 py-2 ${
              item.isActive ? 'bg-button text-white' : 'hover:bg-button hover:bg-opacity-20'
            }`}
            onClick={() => onChange(item.key)}
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
};

export default NavPills;
