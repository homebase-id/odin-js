import { Link } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import { RedactedAppRegistration } from '../../../provider/app/AppManagementProviderTypes';
import Grid from '../../ui/Icons/Grid/Grid';

const AppMembershipView = ({
  appDef,
  permissionLevel,
  className,
}: {
  appDef: RedactedAppRegistration;
  permissionLevel?: string;
  className?: string;
}) => {
  if (!appDef) {
    return <></>;
  }

  return (
    <div className={`${className ?? ''} ${appDef.isRevoked && 'opacity-50'}`}>
      <Link to={`/owner/apps/${appDef.appId}`}>
        <h2 className="flex flex-row text-xl">
          <Grid className="my-auto mr-2 h-5 w-5" />{' '}
          <span className="my-auto">
            {appDef.isRevoked && `${t('Revoked')}: `}
            {appDef.name}
          </span>
          {permissionLevel && <span className="my-auto">: {permissionLevel}</span>}
        </h2>
      </Link>
    </div>
  );
};

export default AppMembershipView;
