import AppPermissionView from '../AppPermissionView/AppPermissionView';
import { useApps } from '../../../hooks/apps/useApps';
import { ReactNode } from 'react';
import { stringGuidsEqual } from '@youfoundation/js-lib/helpers';

export const AppInteractionPermissionOverview = ({
  circleId,
  fallbackMessage,
}: {
  circleId: string;
  fallbackMessage: ReactNode;
}) => {
  const { data: apps } = useApps().fetchRegistered;

  const allowedApps = apps?.filter((app) =>
    app.authorizedCircles.some((authorizedCircle) => stringGuidsEqual(authorizedCircle, circleId))
  );

  return (
    <>
      {allowedApps?.length ? (
        <div className="-my-4">
          {allowedApps.map((app) => (
            <AppPermissionView appDef={app} key={app.appId} className="my-4" />
          ))}
        </div>
      ) : (
        fallbackMessage
      )}
    </>
  );
};
