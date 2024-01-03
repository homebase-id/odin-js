import CompanyCard, { CompanyCardProps } from '../CompanyCard/CompanyCard';

const DomainCard = (props: CompanyCardProps) => {
  return (
    <CompanyCard {...props}>
      <h2 className="font-thiner flex flex-col dark:text-white">
        <span className="break-words">{props.domain}</span>
      </h2>
      {props.children}
    </CompanyCard>
  );
};

export default DomainCard;
