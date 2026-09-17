import type { LayoutProps } from '../../CardDesign';

export const BoardPage = ({ data }: LayoutProps) => (
  <div className="p-16">
    <h1 className="text-6xl">
      {data.firstName} {data.surName}
    </h1>
  </div>
);
