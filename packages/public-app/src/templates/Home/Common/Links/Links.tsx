import Links from '../../../../components/ui/Layout/Links/Links';

const LinksHome = ({ className }: { className?: string }) => {
  return (
    <div className={className ?? ''}>
      <div className="-mx-2 flex max-w-6xl flex-col lg:flex-row xl:-mx-4">
        <div className="py-2 px-2 lg:w-2/3 xl:px-4">
          <Links includeSocials={true} direction={'col'} />
        </div>
      </div>
    </div>
  );
};
export default LinksHome;
