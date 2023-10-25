import {
  AppRegistrationRequest,
  DriveGrantRequest,
} from '../../provider/app/AppManagementProviderTypes';
import useApp from '../../hooks/apps/useApp';
import Section from '../../components/ui/Sections/Section';

import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActionButton, ErrorNotification } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import { CircleSelector } from '@youfoundation/common-app';
import { PermissionSet } from '@youfoundation/js-lib/core';
import { DomainHighlighter } from '@youfoundation/common-app';
import { Arrow } from '@youfoundation/common-app';
import useDrives from '../../hooks/drives/useDrives';
import { tryJsonParse } from '@youfoundation/js-lib/helpers';

// https://frodo.digital/owner/appreg?n=Chatr&appId=0babb1e6-7604-4bcd-b1fb-87e959226492&fn=My%20Phone&p=10,30&d=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A3%7D%2C%7B%22a%22%3A%222612429d1c3f037282b8d42fb2cc0499%22%2C%22t%22%3A%2270e92f0f94d05f5c7dcd36466094f3a5%22%2C%22n%22%3A%22Contacts%22%2C%22d%22%3A%22Contacts%22%2C%22p%22%3A3%7D%5D&ui=minimal&return=homebase-chat://&pk=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtP9KKODoOZpNGXQy4IdyyBJJO3HJPkbg%2FLXwR5SQGxWWuLpv2THnZoSHqaDl6YWQ3OWCndY22Q0RJZkDBuqqJyn%2B8ErpMdgtJuMhFOpEU2h9nLGeI7BIWENkuqlqBh56YC8qdfYhfpdcv53p106o%2Bi93%2Bzeb0GvfLN6fk1y8o4Rd56DBHXn9zjjDaLWa8m8EDXgZKs7waziPFArIphh0W06Wnb4wCa%2F%2B1HEULhH%2BsIY7bGpoQvgP7xucHZGrqkRmg5X2XhleBIXWYCD7QUM6PvKHdqUSrFkl9Z2UU1SkVAhUUH4UxfwyLQKHXxC7IhKu2VSOXK4%2FkjGua6iW%2BXUQtwIDAQAB
// https://frodo.digital/owner/appreg?n=Chatr&appId=0babb1e6-7604-4bcd-b1fb-87e959226492&fn=My%20Phone&p=10,30&d=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A3%7D%2C%7B%22a%22%3A%222612429d1c3f037282b8d42fb2cc0499%22%2C%22t%22%3A%2270e92f0f94d05f5c7dcd36466094f3a5%22%2C%22n%22%3A%22Contacts%22%2C%22d%22%3A%22Contacts%22%2C%22p%22%3A3%7D%5D&cd=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A2%7D%5D&ui=minimal&return=homebase-chat://&pk=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtP9KKODoOZpNGXQy4IdyyBJJO3HJPkbg%2FLXwR5SQGxWWuLpv2THnZoSHqaDl6YWQ3OWCndY22Q0RJZkDBuqqJyn%2B8ErpMdgtJuMhFOpEU2h9nLGeI7BIWENkuqlqBh56YC8qdfYhfpdcv53p106o%2Bi93%2Bzeb0GvfLN6fk1y8o4Rd56DBHXn9zjjDaLWa8m8EDXgZKs7waziPFArIphh0W06Wnb4wCa%2F%2B1HEULhH%2BsIY7bGpoQvgP7xucHZGrqkRmg5X2XhleBIXWYCD7QUM6PvKHdqUSrFkl9Z2UU1SkVAhUUH4UxfwyLQKHXxC7IhKu2VSOXK4%2FkjGua6iW%2BXUQtwIDAQAB

/*
 * incoming parameters:
 *   values on AppClientRegistrationRequest
 *
 *   Required Drive Creation Specs
 *     Alias
 *     Type
 *     Name
 *
 *   Required Permissions
 *     i.e. can create circles, etc.
 */

const RegisterApp = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();

  const appId = searchParams.get('appId');
  const name = searchParams.get('n');
  const origin = searchParams.get('o') || undefined;
  const returnUrl = searchParams.get('return');

  const p = searchParams.get('p');
  const permissionSet = p ? permissionParamToPermissionSet(p) : undefined;
  const d = searchParams.get('d');
  const driveGrants = d ? drivesParamToDriveGrantRequest(d) : undefined;

  const cp = searchParams.get('cp');
  const circlePermissionSet = cp ? permissionParamToPermissionSet(cp) : undefined;
  const cd = searchParams.get('cd');
  const circleDriveGrants = cd ? drivesParamToDriveGrantRequest(cd) : undefined;

  if (!appId || !name || !returnUrl) {
    console.error(
      'Any of the following required params was not found in the url: appId, name, returnUrl'
    );
    return <div>Bad request</div>;
  }

  const {
    mutateAsync: registerApp,
    status: registerAppState,
    error: registerAppError,
  } = useApp({ appId }).registerNewApp;

  const doRegisterApp = async (request: AppRegistrationRequest) => {
    await registerApp(request);
    window.location.href = returnUrl;
  };

  const doCancel = () =>
    (window.location.href = returnUrl
      ? `${returnUrl.split('?')[0]}?error=cancelled-by-user`
      : '/owner');

  return (
    <>
      <ErrorNotification error={registerAppError} />

      <section className="my-20">
        <div className="container mx-auto">
          <div className="max-w-[35rem]">
            <AppRegistration
              name={name}
              appId={appId}
              origin={origin}
              permissionSet={permissionSet}
              driveGrants={driveGrants}
              circlePermissionSet={circlePermissionSet}
              circleDriveGrants={circleDriveGrants}
              registerApp={doRegisterApp}
              registerAppState={registerAppState}
              doCancel={doCancel}
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default RegisterApp;

const AppRegistration = ({
  name,
  appId,
  origin,
  permissionSet,
  driveGrants,
  circlePermissionSet,
  circleDriveGrants,
  registerApp,
  registerAppState,
  doCancel,
}: {
  name: string;
  appId: string;
  origin: string | undefined;
  permissionSet?: PermissionSet;
  driveGrants?: DriveGrantRequest[];
  circlePermissionSet?: PermissionSet;
  circleDriveGrants?: DriveGrantRequest[];
  registerApp: (data: AppRegistrationRequest) => Promise<void>;
  registerAppState: 'idle' | 'loading' | 'error' | 'success';
  doCancel: () => void;
}) => {
  const [circleIds, setCircleIds] = useState<string[]>([]);
  const { data: existingDrives } = useDrives().fetch;

  const needsCircleSelection = circleDriveGrants?.length;
  const [circleSelection, setCircleSelection] = useState(false);

  const doRegisterApp = async () => {
    await registerApp({
      appId: appId,
      name: name,
      corsHostName: origin,
      permissionSet: permissionSet,
      drives: driveGrants,
      authorizedCircles: circleIds,
      circleMemberPermissionGrant: {
        drives: circleDriveGrants,
        permissionSet: circlePermissionSet,
      },
    });
  };

  const existingDriveGrants = driveGrants?.filter(
    (grant) =>
      existingDrives?.some(
        (drive) =>
          drive.targetDriveInfo.alias === grant.permissionedDrive.drive.alias &&
          drive.targetDriveInfo.type === grant.permissionedDrive.drive.type
      )
  );

  const newDriveGrants = driveGrants?.filter(
    (grant) =>
      !existingDrives?.some(
        (drive) =>
          drive.targetDriveInfo.alias === grant.permissionedDrive.drive.alias &&
          drive.targetDriveInfo.type === grant.permissionedDrive.drive.type
      )
  );

  return (
    <>
      <h1 className="mb-5 text-4xl dark:text-white">
        {t('Create new app')}:
        <small className="block">
          {name}{' '}
          {origin ? (
            <>
              (<DomainHighlighter>{origin}</DomainHighlighter>)
            </>
          ) : (
            ''
          )}
        </small>
      </h1>
      {!circleSelection ? (
        <>
          <p>
            {t('The app')} &quot;{name}&quot; {t('is not registered on your identity')}.
          </p>
          <p className="mt-2">
            {t('By allowing, this app')}, &quot;{name}&quot;{' '}
            {t('will have the following access on your identity')}:
          </p>
          {permissionSet?.keys.length ? (
            <Section>
              <div className="flex flex-col gap-4">
                {permissionSet.keys.map((permissionLevel) => {
                  return <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />;
                })}
              </div>
            </Section>
          ) : null}
          {existingDriveGrants?.length ? (
            <Section>
              <div className="flex flex-col gap-4">
                {existingDriveGrants.map((grant) => (
                  <DrivePermissionRequestView
                    key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                    driveGrant={grant}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          {newDriveGrants?.length ? (
            <>
              <p>{t('And requests these new drives')}</p>
              <Section>
                <div className="flex flex-col gap-4">
                  {newDriveGrants.map((grant) => (
                    <DrivePermissionRequestView
                      key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                      driveGrant={grant}
                    />
                  ))}
                </div>
              </Section>
            </>
          ) : null}
        </>
      ) : (
        <>
          <p className="mb-5">
            {t('Which circles are allowed to interact with you on')} &quot;{name}&quot;:
          </p>

          <CircleSelector
            defaultValue={circleIds}
            onChange={(e) => {
              setCircleIds(e.target.value);
            }}
          />
          <p className="mt-8">
            {t('The selected cricles will receive the following access within')} &quot;
            {name}&quot;:
          </p>
          {circlePermissionSet?.keys?.length ? (
            <Section>
              <div className="-my-4">
                {circlePermissionSet.keys.map((permissionLevel) => (
                  <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />
                ))}
              </div>
            </Section>
          ) : null}
          {circleDriveGrants?.length ? (
            <Section>
              <div className="flex flex-col gap-4">
                {circleDriveGrants.map((grant) => (
                  <DrivePermissionRequestView
                    key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                    driveGrant={grant}
                  />
                ))}
              </div>
            </Section>
          ) : null}
        </>
      )}

      {needsCircleSelection && !circleSelection ? (
        <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
          <ActionButton onClick={() => setCircleSelection(true)} type="primary" icon={Arrow}>
            {t('Next')}
          </ActionButton>
          <ActionButton type="secondary" onClick={() => doCancel()}>
            {t('Cancel')}
          </ActionButton>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
          <ActionButton
            onClick={doRegisterApp}
            type="primary"
            state={registerAppState}
            icon={Arrow}
          >
            {t('Allow')}
          </ActionButton>
          {needsCircleSelection ? (
            <ActionButton type="secondary" onClick={() => setCircleSelection(false)}>
              {t('Back')}
            </ActionButton>
          ) : (
            <ActionButton type="secondary" onClick={() => doCancel()}>
              {t('Cancel')}
            </ActionButton>
          )}
        </div>
      )}
    </>
  );
};

/// Converts query string param to DriveGrantRequest
// encodeURIComponent(
//   JSON.stringify([
//     {
//       a: '9ff813aff2d61e2f9b9db189e72d1a11',
//       t: '66ea8355ae4155c39b5a719166b510e3',
//       n: 'Chat Drive',
//       d: 'Chat Drive',
//       p: 3,
//     },
//     {
//       a: '2612429d1c3f037282b8d42fb2cc0499',
//       t: '70e92f0f94d05f5c7dcd36466094f3a5',
//       n: 'Contacts',
//       d: 'Contacts',
//       p: 3,
//     },
//   ])
// );
const drivesParamToDriveGrantRequest = (queryParamVal: string | undefined): DriveGrantRequest[] => {
  if (!queryParamVal) {
    return [];
  }
  try {
    const drivesParamObject = queryParamVal && tryJsonParse(queryParamVal);
    return (Array.isArray(drivesParamObject) ? drivesParamObject : [drivesParamObject]).map((d) => {
      return {
        permissionedDrive: {
          drive: {
            alias: d.a,
            type: d.t,
          },
          // I know, probably not really "safe" to do this... But hey, the drivePermission are hard
          permission: [parseInt(d.p)],
        },
        driveMeta: {
          name: d.n,
          description: d.d,
        },
      };
    });
  } catch (ex) {
    return [];
  }
};

const permissionParamToPermissionSet = (queryParamVal: string | undefined): PermissionSet => {
  return {
    keys: queryParamVal?.split(',').map((str) => parseInt(str)) ?? [],
  };
};
