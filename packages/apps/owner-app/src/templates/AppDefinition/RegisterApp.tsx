import {
  AppCircleDeclaration,
  AppRegistrationRequest,
  DriveGrantRequest,
} from '../../provider/app/AppManagementProviderTypes';
import { useApp, ZkPasswordNeededError } from '../../hooks/apps/useApp';
import { ZkPasswordField } from './ZkPasswordField';
import Section from '../../components/ui/Sections/Section';

import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import DrivePermissionRequestView from '../../components/PermissionViews/DrivePermissionRequestView/DrivePermissionRequestView';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ActionButton,
  ActionButtonState,
  ErrorNotification,
  t,
  CircleSelector,
  getCancelRedirectUrl,
  getStateParam,
} from '@homebase-id/common-app';
import { PermissionSet } from '@homebase-id/js-lib/core';
import { drivesEqual, isValidSlug, stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { Arrow } from '@homebase-id/common-app/icons';
import { useDrives } from '../../hooks/drives/useDrives';
import {
  permissionParamToPermissionSet,
  drivesParamToDriveGrantRequest,
  drivesParamProblems,
  circleParamToCircleIds,
  appCirclesParamProblems,
  appCirclesParamToDeclarations,
} from './util';
import { InvalidAppRequest } from './InvalidAppRequest';
import { resolveReturnUrl } from '../../hooks/auth/useAuth';
import { AlreadyInstalled, AppName } from './AlreadyInstalled';

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
  // The app names itself; we do not derive a slug from the display name. It is permanent and
  // first-come, so an app that did not say what it wants to be called has not finished asking.
  const appSlug = searchParams.get('as');
  const origin = searchParams.get('o') || undefined;
  // Only to a URL the browser may safely go to: never javascript: and the like
  const returnUrl = resolveReturnUrl(searchParams.get('return'));
  const cancelUrl = resolveReturnUrl(searchParams.get('cancel'));

  const p = searchParams.get('p');
  const permissionSet = p ? permissionParamToPermissionSet(p) : undefined;
  const d = searchParams.get('d');
  // Empty array when the param is absent, undefined when it is malformed -- see
  // drivesParamToDriveGrantRequest.
  const driveGrants = drivesParamToDriveGrantRequest(d || undefined);

  const c = searchParams.get('c');
  const circleSelection = c ? circleParamToCircleIds(c) : undefined;
  const cp = searchParams.get('cp');
  const circlePermissionSet = cp ? permissionParamToPermissionSet(cp) : undefined;
  const cd = searchParams.get('cd');
  const circleDriveGrants = drivesParamToDriveGrantRequest(cd || undefined);
  // Circles the app declares, created with it (odin-core #1939). Optional: empty when absent.
  const ac = searchParams.get('ac');
  const appCircles = appCirclesParamToDeclarations(ac || undefined);

  // The server refuses a missing or malformed app slug and never coerces one, built-in apps
  // included, so a bad `as` is refused here before the owner is asked to approve anything. Every
  // problem is named, so the developer can fix the link without guessing.
  const problems = [
    ...(!appId ? [t('`appId` is missing')] : []),
    ...(!name ? [t('`n` (app name) is missing')] : []),
    ...(!appSlug
      ? [t('`as` (app slug) is missing')]
      : !isValidSlug(appSlug)
        ? [`${t('`as` (app slug) is not a valid slug')} ("${appSlug}")`]
        : []),
    ...(!returnUrl ? [t('`return` is missing, or not a URL to go back to')] : []),
    ...drivesParamProblems(d || undefined, 'd'),
    ...drivesParamProblems(cd || undefined, 'cd'),
    ...appCirclesParamProblems(ac || undefined),
  ];

  if (
    problems.length ||
    !appId ||
    !name ||
    !appSlug ||
    !returnUrl ||
    !driveGrants ||
    !circleDriveGrants ||
    !appCircles
  ) {
    console.error('Invalid app registration request', problems);
    return (
      <InvalidAppRequest
        appName={name}
        origin={origin}
        problems={problems}
        cancelUrl={cancelUrl}
        returnUrl={returnUrl}
      />
    );
  }

  const { fetch: installed, registerNewApp, setZkPassword } = useApp({ appId });
  // Started here, with the app's lookup, rather than once the install screen mounts
  useDrives();
  const {
    mutateAsync: registerApp,
    status: registerAppState,
    error: registerAppError,
  } = registerNewApp;

  // A drive the app asked for private needs the password when this session holds no zero-knowledge key. Once asked
  // for, the field stays: a wrong password shows its error, and the owner types it again.
  const [needsPassword, setNeedsPassword] = useState(false);
  const doRegisterApp = async (request: AppRegistrationRequest) => {
    try {
      await registerApp(request);
    } catch (error) {
      // Shown from the mutation's error
      if (error instanceof ZkPasswordNeededError) setNeedsPassword(true);
      return;
    }
    window.location.href = returnUrl;
  };

  const doCancel = () =>
    (window.location.href = cancelUrl
      ? getCancelRedirectUrl(cancelUrl, getStateParam(returnUrl))
      : '/owner');

  // Registering an app again is refused: it would replace the keys its devices hold (odin-core #2039).
  // Once this page has registered it, the app's lookup answers too, while the page leaves.
  if (!installed.isFetched) return null;
  if (installed.data && registerAppState !== 'success')
    return (
      <AlreadyInstalled
        app={installed.data}
        requestedSlug={appSlug}
        doContinue={() => (window.location.href = returnUrl)}
        doCancel={doCancel}
      />
    );

  return (
    <>
      <ErrorNotification
        error={registerAppError instanceof ZkPasswordNeededError ? undefined : registerAppError}
      />

      <section className="my-20">
        <div className="container mx-auto">
          <div className="max-w-[35rem]">
            <AppRegistration
              name={name}
              appId={appId}
              appSlug={appSlug}
              origin={origin}
              permissionSet={permissionSet}
              driveGrants={driveGrants}
              defaultCircleIds={circleSelection}
              circlePermissionSet={circlePermissionSet}
              circleDriveGrants={circleDriveGrants}
              appCircles={appCircles}
              registerApp={doRegisterApp}
              registerAppState={
                needsPassword && registerAppState === 'error' ? 'idle' : registerAppState
              }
              needsPassword={needsPassword}
              onPassword={setZkPassword}
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
  appSlug,
  origin,
  permissionSet,
  driveGrants,
  defaultCircleIds,
  circlePermissionSet,
  circleDriveGrants,
  appCircles,
  registerApp,
  registerAppState,
  needsPassword,
  onPassword,
  doCancel,
}: {
  name: string;
  appId: string;
  appSlug: string;
  origin: string | undefined;
  permissionSet?: PermissionSet;
  driveGrants?: DriveGrantRequest[];
  defaultCircleIds?: string[];
  circlePermissionSet?: PermissionSet;
  circleDriveGrants?: DriveGrantRequest[];
  appCircles: AppCircleDeclaration[];
  registerApp: (data: AppRegistrationRequest) => Promise<void>;
  registerAppState: ActionButtonState;
  needsPassword: boolean;
  onPassword: (password: string) => void;
  doCancel: () => void;
}) => {
  const [circleIds, setCircleIds] = useState<string[]>(defaultCircleIds || []);
  const { data: existingDrives } = useDrives().fetch;
  const needsCircleSelection = circleDriveGrants?.length;
  const [circleSelection, setCircleSelection] = useState(false);

  const doRegisterApp = async () => {
    await registerApp({
      appId: appId,
      name: name,
      // Permanent once written, so this is the app's one chance to name itself.
      appSlug: appSlug,
      corsHostName: origin,
      permissionSet: permissionSet,
      drives: driveGrants,
      authorizedCircles: circleIds,
      circleMemberPermissionGrant: {
        drives: circleDriveGrants,
        permissionSet: circlePermissionSet,
      },
      circles: appCircles,
    });
  };

  // A declared circle's grant names only the drive; borrow the name the app gave it in `d`, so a
  // drive this install is about to create shows by name rather than as an unknown alias.
  const withDriveMeta = (grant: DriveGrantRequest): DriveGrantRequest => ({
    ...grant,
    driveMeta: driveGrants?.find((requested) =>
      drivesEqual(requested.permissionedDrive.drive, grant.permissionedDrive.drive)
    )?.driveMeta,
  });

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
        {t('Create new app')}:
        <AppName name={name} origin={origin} />
        {/* The slug is permanent and first-come, so the owner should be able to see the name being
            claimed -- but it is an address, not something they are being asked to weigh. */}
        <small className="block text-sm font-normal text-slate-400 dark:text-slate-500">
          /apps/{appSlug}
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
                    // Install changes settings only on a drive this app already owns.
                    showRequestedChanges={existingDrives?.some(
                      (drive) =>
                        drivesEqual(drive.targetDriveInfo, grant.permissionedDrive.drive) &&
                        stringGuidsEqual(drive.appId ?? undefined, appId)
                    )}
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

          {appCircles.length ? (
            <>
              <p>
                {t(
                  'And creates these circles, which it owns. Anyone added to one gets what it grants'
                )}
                :
              </p>
              <Section>
                <div className="flex flex-col gap-6">
                  {appCircles.map((circle) => (
                    <div key={circle.slug} className="flex flex-col gap-2">
                      <p className="leading-none">
                        {circle.emoji ? `${circle.emoji} ` : ''}
                        <span className="font-bold">{circle.name}</span>
                        {circle.description ? (
                          <span className="block text-sm text-slate-400">{circle.description}</span>
                        ) : null}
                      </p>
                      {circle.permissions.keys.map((permissionLevel) => (
                        <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />
                      ))}
                      {circle.driveGrants.map((grant) => (
                        <DrivePermissionRequestView
                          key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                          driveGrant={withDriveMeta(grant)}
                        />
                      ))}
                    </div>
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
            {t('The selected circles will receive the following access within')} &quot;
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
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <ActionButton onClick={() => setCircleSelection(true)} type="primary" icon={Arrow}>
            {t('Next')}
          </ActionButton>
          <ActionButton type="secondary" onClick={() => doCancel()}>
            {t('Cancel')}
          </ActionButton>
        </div>
      ) : (
        <>
          {needsPassword ? <ZkPasswordField onChange={onPassword} /> : null}
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
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
        </>
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
