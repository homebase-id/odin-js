import type { CardData } from '../../useCardData';
import { CardLabel } from '../../parts/Type';

// The reference sets the caption a step larger and wider on the page than on the card
const SIZES = {
  card: {
    row: 'pt-3 text-[11px]',
    label: '',
  },
  page: {
    row: 'text-[12px] min-[1280px]:text-[13px]',
    label: '!tracking-[0.24em]',
  },
};

export const PosterCaption = ({
  data,
  size,
  className,
}: {
  data: CardData;
  size: keyof typeof SIZES;
  className?: string;
}) => {
  const sizes = SIZES[size];
  return (
    <div className={`overflow-hidden ${className ?? ''}`}>
      <div className={`-ms-[2.4em] flex flex-wrap items-start gap-y-0.5 empty:hidden ${sizes.row}`}>
        {data.headline ? (
          <CardLabel className={`ps-[2.4em] !text-[length:inherit] ${sizes.label}`}>
            {data.headline}
          </CardLabel>
        ) : null}
      </div>
    </div>
  );
};
