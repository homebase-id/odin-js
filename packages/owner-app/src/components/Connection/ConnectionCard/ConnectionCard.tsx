import { useContact } from '../../../hooks/contacts/useContact';
import { LoadingBlock } from '@youfoundation/common-app';
import PersonCard, { PersonCardProps } from '../PersonCard/PersonCard';

const ConnectionCard = (props: PersonCardProps) => {
  const { data: contactData, isLoading } = useContact({
    odinId: props.odinId,
    canSave: props.canSave,
  }).fetch;
  const nameData = contactData?.fileMetadata.appData.content?.name;
  const fullName = nameData
    ? nameData.displayName ?? `${nameData.givenName ?? ''} ${nameData.surname ?? ''}`
    : props.odinId;

  if (isLoading) {
    return <LoadingBlock className={`aspect-[3/5] ${props.className}`} />;
  }

  return (
    <>
      <PersonCard {...props}>
        <h2 className="font-thiner flex flex-col dark:text-white">
          <span className="break-words">{fullName ?? props.odinId}</span>
          {fullName ? (
            <small className="d-block break-words text-sm text-slate-500 dark:text-slate-400">
              {props.odinId}
            </small>
          ) : (
            ''
          )}
        </h2>
        {props.children}
      </PersonCard>
    </>
  );
};

export default ConnectionCard;
