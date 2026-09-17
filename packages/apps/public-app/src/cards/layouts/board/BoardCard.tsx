import type { LayoutProps } from '../../CardDesign';

export const BoardCard = ({ data }: LayoutProps) => (
  <div className="p-6">
    <h1 className="text-3xl">
      {data.firstName} {data.surName}
    </h1>
  </div>
);
