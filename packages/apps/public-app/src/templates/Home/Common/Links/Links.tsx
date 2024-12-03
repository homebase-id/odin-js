import Links from '../../../../components/ui/Layout/Links/Links';

const LinksHome = ({ className }: { className?: string }) => {
  return (
    <div className={className ?? ''}>
      <div className="flex max-w-7xl flex-col gap-2 lg:flex-row xl:gap-4">
        <div className="lg:w-2/3">
          <Links includeSocials={true} direction={'col'} />
        </div>
      </div>
    </div>
  );
};
export default LinksHome;
