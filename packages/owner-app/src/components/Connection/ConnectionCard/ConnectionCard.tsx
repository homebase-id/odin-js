import useContact from '../../../hooks/contacts/useContact';
import { LoadingBlock } from '@youfoundation/common-app';
import PersonCard, { PersonCardProps } from '../PersonCard/PersonCard';
import DomainCard from '../DomainCard/DomainCard';

const ConnectionCard = (props: PersonCardProps) => {
  const { data: contactData, isLoading } = useContact({
    odinId: props.odinId,
  }).fetch;
  const nameData = contactData?.name;
  const fullName = nameData
    ? nameData.displayName ?? `${nameData.givenName ?? ''} ${nameData.surname ?? ''}`
    : props.odinId;

  if (isLoading) {
    return <LoadingBlock className={`aspect-[3/5] ${props.className}`} />;
  }

  // Todo: switch between PersonCard and DomainCard based on the type of the identity
  return (
    <>
      <PersonCard {...props}>
        <h2 className="font-thiner mb-6 flex flex-col dark:text-white">
          <span>{fullName ?? props.odinId}</span>
          {fullName ? (
            <small className="d-block text-sm text-slate-500 dark:text-slate-400">
              {props.odinId}
            </small>
          ) : (
            ''
          )}
        </h2>
        {props.children}
      </PersonCard>
      <DomainCard {...props}>
        <h2 className="font-thiner mb-6 flex flex-col dark:text-white">
          <span>{fullName ?? props.odinId}</span>
          {fullName ? (
            <small className="d-block text-sm text-slate-500 dark:text-slate-400">
              {props.odinId}
            </small>
          ) : (
            ''
          )}
        </h2>
        {props.children}
      </DomainCard>
    </>
  );
};

export default ConnectionCard;
