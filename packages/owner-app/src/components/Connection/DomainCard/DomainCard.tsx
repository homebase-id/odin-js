import CompanyCard, { CompanyCardProps } from '../CompanyCard/CompanyCard';

const DomainCard = (props: CompanyCardProps) => {
  //   if (isLoading) {
  //     return <LoadingBlock className={`aspect-[3/5] ${props.className}`} />;
  //   }

  const fullName = undefined;
  return (
    <>
      <CompanyCard {...props}>
        <h2 className="font-thiner mb-6 flex flex-col dark:text-white">
          <span>{fullName ?? props.domain}</span>
          {fullName ? (
            <small className="d-block text-sm text-slate-500 dark:text-slate-400">
              {props.domain}
            </small>
          ) : (
            ''
          )}
        </h2>
        {props.children}
      </CompanyCard>
    </>
  );
};

export default DomainCard;
