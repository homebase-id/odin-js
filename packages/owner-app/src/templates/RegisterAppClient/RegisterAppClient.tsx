import {
  AppRegistrationRequest,
  DriveGrantRequest,
  RedactedAppRegistration,
} from '../../provider/app/AppManagementProviderTypes';
import useApp from '../../hooks/apps/useApp';
import ActionButton, { mergeStates } from '../../components/ui/Buttons/ActionButton';
import Section from '../../components/ui/Sections/Section';

import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import DrivePermissionView from '../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorNotification } from '@youfoundation/common-app';
import { t } from '@youfoundation/common-app';
import CircleSelector from '../../components/Form/CircleSelector';
import useAppClients from '../../hooks/apps/useAppClients';
import { PermissionSet } from '@youfoundation/js-lib';
import { DomainHighlighter } from '@youfoundation/common-app';
import { Arrow } from '@youfoundation/common-app';
import { Alert } from '@youfoundation/common-app';
import useDrives from '../../hooks/drives/useDrives';
import { Times } from '@youfoundation/common-app';
import { Input } from '@youfoundation/common-app';

// https://frodo.digital/owner/appreg?n=Chatr&appId=0babb1e6-7604-4bcd-b1fb-87e959226492&fn=My%20Phone&p=10,30&d=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A3%7D%2C%7B%22a%22%3A%222612429d1c3f037282b8d42fb2cc0499%22%2C%22t%22%3A%2270e92f0f94d05f5c7dcd36466094f3a5%22%2C%22n%22%3A%22Contacts%22%2C%22d%22%3A%22Contacts%22%2C%22p%22%3A3%7D%5D&ui=minimal&return=odin-chat://&pk=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtP9KKODoOZpNGXQy4IdyyBJJO3HJPkbg%2FLXwR5SQGxWWuLpv2THnZoSHqaDl6YWQ3OWCndY22Q0RJZkDBuqqJyn%2B8ErpMdgtJuMhFOpEU2h9nLGeI7BIWENkuqlqBh56YC8qdfYhfpdcv53p106o%2Bi93%2Bzeb0GvfLN6fk1y8o4Rd56DBHXn9zjjDaLWa8m8EDXgZKs7waziPFArIphh0W06Wnb4wCa%2F%2B1HEULhH%2BsIY7bGpoQvgP7xucHZGrqkRmg5X2XhleBIXWYCD7QUM6PvKHdqUSrFkl9Z2UU1SkVAhUUH4UxfwyLQKHXxC7IhKu2VSOXK4%2FkjGua6iW%2BXUQtwIDAQAB
// https://frodo.digital/owner/appreg?n=Chatr&appId=0babb1e6-7604-4bcd-b1fb-87e959226492&fn=My%20Phone&p=10,30&d=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A3%7D%2C%7B%22a%22%3A%222612429d1c3f037282b8d42fb2cc0499%22%2C%22t%22%3A%2270e92f0f94d05f5c7dcd36466094f3a5%22%2C%22n%22%3A%22Contacts%22%2C%22d%22%3A%22Contacts%22%2C%22p%22%3A3%7D%5D&cd=%5B%7B%22a%22%3A%229ff813aff2d61e2f9b9db189e72d1a11%22%2C%22t%22%3A%2266ea8355ae4155c39b5a719166b510e3%22%2C%22n%22%3A%22Chat%20Drive%22%2C%22d%22%3A%22Chat%20Drive%22%2C%22p%22%3A2%7D%5D&ui=minimal&return=odin-chat://&pk=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtP9KKODoOZpNGXQy4IdyyBJJO3HJPkbg%2FLXwR5SQGxWWuLpv2THnZoSHqaDl6YWQ3OWCndY22Q0RJZkDBuqqJyn%2B8ErpMdgtJuMhFOpEU2h9nLGeI7BIWENkuqlqBh56YC8qdfYhfpdcv53p106o%2Bi93%2Bzeb0GvfLN6fk1y8o4Rd56DBHXn9zjjDaLWa8m8EDXgZKs7waziPFArIphh0W06Wnb4wCa%2F%2B1HEULhH%2BsIY7bGpoQvgP7xucHZGrqkRmg5X2XhleBIXWYCD7QUM6PvKHdqUSrFkl9Z2UU1SkVAhUUH4UxfwyLQKHXxC7IhKu2VSOXK4%2FkjGua6iW%2BXUQtwIDAQAB

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

const RegisterClient = () => {
  // Read the queryString
  const [searchParams] = useSearchParams();

  const appId = searchParams.get('appId');
  const name = searchParams.get('n');
  const origin = searchParams.get('o') || undefined;
  const publicKey64 = searchParams.get('pk');
  const friendlyName = searchParams.get('fn');
  const returnUrl = searchParams.get('return');

  const p = searchParams.get('p');
  const permissionSet = p ? permissionParamToPermissionSet(p) : undefined;
  const d = searchParams.get('d');
  const driveGrants = d ? drivesParamToDriveGrantRequest(d) : undefined;

  const cp = searchParams.get('cp');
  const circlePermissionSet = cp ? permissionParamToPermissionSet(cp) : undefined;
  const cd = searchParams.get('cd');
  const circleDriveGrants = cd ? drivesParamToDriveGrantRequest(cd) : undefined;

  if (!appId || !name || !publicKey64 || !friendlyName || !returnUrl) {
    console.error(
      'Any of the following required params was not found in the url: appId, name, publicKey64, friendlyName, returnUrl'
    );
    return <div>Bad request</div>;
  }

  const {
    fetch: { data: appRegistration, isLoading: appRegIsLoading },
    registerNewApp: { mutateAsync: registerApp, status: registerAppState, error: registerAppError },
  } = useApp({ appId });
  const {
    registerClient: {
      mutateAsync: registerClient,
      status: registerClientState,
      error: regsiterClientError,
    },
  } = useAppClients({ appId });

  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [finalUrl, setFinalUrl] = useState<string | null>();

  const doRegisterClient = async (customFriendlyName?: string) => {
    const clientRegistrationResponse = await registerClient({
      appId: appId,
      clientPublicKey64: publicKey64,
      clientFriendlyName: customFriendlyName || friendlyName,
    });

    console.log('data', clientRegistrationResponse.data);

    const encodedData = encodeURIComponent(clientRegistrationResponse.data);
    const url = `${returnUrl}d=${encodedData}&v=${clientRegistrationResponse.encryptionVersion}&id=${window.location.hostname}`;

    console.log(url);
    window.location.href = url;
    setFinalUrl(url);
  };

  const doCancel = () => {
    setIsCancelled(true);
  };

  if (appRegIsLoading) {
    return <div>Loading...</div>;
  }

  const returnOrigin = new URL(returnUrl).origin;
  const returnHost = returnOrigin.split('://')[1] || returnOrigin;

  return (
    <>
      <ErrorNotification error={registerAppError} />
      <ErrorNotification error={regsiterClientError} />

      <section className="my-20">
        <div className="container mx-auto">
          <div className="max-w-[35rem]">
            {isCancelled ? (
              <>
                <h1 className="mb-5 text-4xl dark:text-white">
                  {t('The registration was cancelled')}
                </h1>

                <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
                  <ActionButton
                    onClick={() => {
                      window.location.href = returnUrl;
                    }}
                    type="primary"
                  >
                    {t('Back to the app')}
                  </ActionButton>
                </div>
              </>
            ) : finalUrl ? (
              <>
                <h1 className="mb-5 text-4xl dark:text-white">
                  {t('Successfully registered client')}:{' '}
                </h1>
                <p className="mb-5">
                  &quot;{friendlyName}&quot; {t('on')} &quot;{name}&quot;
                </p>

                <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
                  <ActionButton
                    onClick={() => {
                      window.location.href = finalUrl;
                    }}
                    type="primary"
                  >
                    {t('Back to the app')}
                  </ActionButton>
                </div>
              </>
            ) : !appRegistration ? (
              <AppRegistration
                name={name}
                appId={appId}
                origin={origin}
                permissionSet={permissionSet}
                driveGrants={driveGrants}
                circlePermissionSet={circlePermissionSet}
                circleDriveGrants={circleDriveGrants}
                registerApp={(request) => registerApp(request)}
                registerAppState={registerAppState}
                doRegisterClient={doRegisterClient}
                registerClientState={registerClientState}
                doCancel={doCancel}
              />
            ) : (
              <AppClientRegistration
                friendlyName={friendlyName}
                name={name}
                appRegistration={appRegistration}
                doRegisterClient={doRegisterClient}
                registerClientState={registerClientState}
                doCancel={doCancel}
                returnHost={returnHost}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default RegisterClient;

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
  doRegisterClient,
  registerClientState,
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
  doRegisterClient: () => void;
  registerClientState: 'error' | 'idle' | 'loading' | 'success';
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

    await doRegisterClient();
  };

  const existingDriveGrants = driveGrants?.filter((grant) =>
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
        {t('Allow new app')}:
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
          <ActionButton onClick={() => setCircleSelection(true)} type="primary" icon="send">
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
            state={mergeStates(registerAppState, registerClientState)}
            icon="send"
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

const AppClientRegistration = ({
  friendlyName,
  name,
  appRegistration,
  doRegisterClient,
  registerClientState,
  doCancel,
  returnHost,
}: {
  friendlyName: string;
  name: string;
  appRegistration: RedactedAppRegistration;
  doRegisterClient: (customFriendlyName?: string) => void;
  registerClientState: 'error' | 'idle' | 'loading' | 'success';
  doCancel: () => void;
  returnHost: string;
}) => {
  const [isDetails, setIsDetails] = useState(false);
  const [isEditFriendlyName, setIsEditFriendlyName] = useState(false);
  const [customFriendlyName, setCustomFriendlyName] = useState<string>();

  const dateFormat: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  return (
    <>
      <h1 className="mb-5 text-4xl dark:text-white">
        {t('App login')}:
        <small className="block">
          {name}{' '}
          {appRegistration.corsHostName ? (
            <>
              (<DomainHighlighter>{returnHost}</DomainHighlighter>)
            </>
          ) : null}
        </small>
      </h1>
      <p>{`${t('By allowing')} "${appRegistration.corsHostName || friendlyName}" ${t(
        'to login you give it access to your'
      )} ${name} app`}</p>
      {appRegistration.corsHostName && appRegistration.corsHostName !== returnHost ? (
        <Alert type="critical" className="my-10" isCompact={true}>
          {t('The origin of this login is different from the origin the app was registered with')} (
          {appRegistration.corsHostName})
        </Alert>
      ) : null}
      <div className="py-5">
        <button
          onClick={() => setIsDetails(!isDetails)}
          className={`flex flex-row items-center ${isDetails ? 'font-bold' : 'text-sm italic'}`}
        >
          {t('Details')}{' '}
          <Arrow className={`ml-2 h-4 w-4 transition-transform ${isDetails ? 'rotate-90' : ''}`} />
        </button>
        {isDetails ? (
          <>
            <p className="mt-2">
              &quot;{name}&quot; {t('is registered on your identity since')}{' '}
              <span className="italic">
                {new Date(appRegistration.created).toLocaleDateString(undefined, dateFormat)}
              </span>{' '}
              {t('and has the following access on your identity')}:
            </p>
            {appRegistration.grant.permissionSet?.keys?.length ? (
              <Section>
                <div className="flex flex-col gap-4">
                  {appRegistration.grant.permissionSet.keys.map((permissionLevel) => {
                    return (
                      <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />
                    );
                  })}
                </div>
              </Section>
            ) : null}
            {appRegistration.grant?.driveGrants ? (
              <Section>
                <div className="flex flex-col gap-4">
                  {appRegistration.grant.driveGrants.map((grant) => {
                    return (
                      <DrivePermissionView
                        key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                        driveGrant={grant}
                      />
                    );
                  })}
                </div>
              </Section>
            ) : null}
            <div className={`flex  ${isEditFriendlyName ? 'flex-col' : 'flex-row'}`}>
              <p className="flex flex-row items-center text-sm">
                <span>{t('Your current device:')}</span> {!isEditFriendlyName ? friendlyName : ''}
              </p>
              <div className="flex flex-row items-center">
                {isEditFriendlyName ? (
                  <Input
                    type="text"
                    defaultValue={friendlyName}
                    className="my-2 text-sm"
                    onChange={(e) => setCustomFriendlyName(e.target.value)}
                  />
                ) : null}

                <ActionButton
                  icon={isEditFriendlyName ? Times : 'edit'}
                  onClick={() => setIsEditFriendlyName(!isEditFriendlyName)}
                  type="mute"
                />
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row-reverse">
        <ActionButton
          onClick={() => doRegisterClient(isEditFriendlyName ? customFriendlyName : undefined)}
          state={registerClientState}
          icon="send"
        >
          {t('Login')}
        </ActionButton>
        <ActionButton type="secondary" onClick={() => doCancel()}>
          {t('Cancel')}
        </ActionButton>
      </div>
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
    const drivesParamObject = queryParamVal && JSON.parse(queryParamVal);
    return (Array.isArray(drivesParamObject) ? drivesParamObject : [drivesParamObject]).map((d) => {
      return {
        permissionedDrive: {
          drive: {
            alias: d.a,
            type: d.t,
          },
          permission: parseInt(d.p),
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
