import ConnectionCard from '../ConnectionCard/ConnectionCard';
import { DotYouProfile } from '@youfoundation/js-lib/network';

const PersonActive = ({
  dotYouProfile,

  className,
}: {
  dotYouProfile: DotYouProfile;
  className: string;
}) => {
  return (
    <ConnectionCard
      className={`${className ?? ''} group relative`}
      odinId={dotYouProfile.odinId}
      href={(dotYouProfile.odinId && `/owner/connections/${dotYouProfile.odinId}`) ?? undefined}
      canSave={true}
    />
  );
};

export default PersonActive;
