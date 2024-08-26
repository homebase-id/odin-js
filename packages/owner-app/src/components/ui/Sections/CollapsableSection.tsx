import { Arrow } from '@youfoundation/common-app/icons';
import { ReactNode, useEffect, useRef, useState } from 'react';

const CollapsableSection = ({
  isOpenByDefault = true,
  title,
  className,
  children,
  isBorderLess = false,
}: {
  isOpenByDefault?: boolean;
  title: ReactNode;
  className?: string;
  children: ReactNode;
  isBorderLess?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(isOpenByDefault);
  const sectionContainerRef = useRef<HTMLDivElement>(null);
  const height = useRef(0);

  useEffect(() => {
    if (isOpenByDefault && sectionContainerRef.current) {
      height.current = sectionContainerRef.current.clientHeight;
    }
    // Todo apply FLIP approach (when not open by default) to calculate the to-be height when we can't use the height of the open state
  }, [isOpen]);

  return (
    <section
      className={`my-5 flex flex-col rounded-md shadow-sm ${
        !isBorderLess
          ? 'rounded-lg border border-gray-200 border-opacity-80 dark:border-gray-700'
          : ''
      }
    bg-white px-5 dark:bg-slate-900 dark:text-slate-300 ${className ?? ''}`}
    >
      <div
        className={`relative cursor-pointer border-b-[1px] border-slate-200 py-5 transition-all duration-300 ${
          isOpen ? 'border-opacity-100' : 'border-opacity-0'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="pr-6 text-2xl dark:text-white">{title}</h3>
        <button className="absolute bottom-0 right-0 top-0">
          <Arrow
            className={`h-5 w-5 transition-transform duration-300 ${
              isOpen ? 'rotate-90' : '-rotate-90'
            }`}
          />
        </button>
      </div>
      <div
        className={`overflow-hidden transition-all duration-300 `}
        style={{ maxHeight: `${isOpen ? (height.current ? height.current : 2000) : 0}px` }}
        ref={sectionContainerRef}
      >
        <div className="py-5 ">{children}</div>
      </div>
    </section>
  );
};

export default CollapsableSection;
