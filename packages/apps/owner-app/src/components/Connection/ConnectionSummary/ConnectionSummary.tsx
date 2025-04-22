import { useContact, ContactName } from '@homebase-id/common-app';
import {
  t,
  ErrorNotification,
  ActionButton,
  mergeStates,
  ActionLink,
  useIdentityIFollow,
  useCircles,
  useOdinClientContext,
  useConnectionInfo,
  useDetailedConnectionInfo,
  useIsConnected,
  ContactImage,
} from '@homebase-id/common-app';
import {
  Envelope,
  Cake,
  House,
  IconFrame,
  Person,
  Phone,
  Refresh,
  ChatBubble,
  Exclamation,
  Check,
  Feed,
} from '@homebase-id/common-app/icons';
import Section from '../../ui/Sections/Section';
import { ApiType, OdinClient, HomebaseFile } from '@homebase-id/js-lib/core';
import {
  AUTO_CONNECTIONS_CIRCLE_ID,
  CONFIRMED_CONNECTIONS_CIRCLE_ID,
  ConnectionInfo,
  ContactFile,
} from '@homebase-id/js-lib/network';
import { useVerifyConnection } from '../../../hooks/connections/useVerifyConnection';
import { stringGuidsEqual } from '@homebase-id/js-lib/helpers';
import { Link } from 'react-router-dom';

interface ContactInfoProps {
  odinId?: string;
  contactId?: string;
}

export const ConnectionSummary = ({ odinId, contactId }: ContactInfoProps) => {
  const {
    fetch: { data: contact },
    refresh: { mutate: refresh, status: refreshState, error: refreshError },
  } = useContact(odinId ? { odinId: odinId, canSave: false } : { id: contactId, canSave: false });
  // Disable saving so we can support manual refresh;

  const {
    mutate: verifyConnection,
    status: verifyConnectionState,
    error: verifyError,
    data: verifyData,
  } = useVerifyConnection().confirmConnection;

  const {
    fetch: { data: connectionInfo },
  } = useDetailedConnectionInfo({ odinId: odinId });
  const loggedOnIdentity = useOdinClientContext().getLoggedInIdentity();

  const { data: isConnectedWithIntroducer } = useIsConnected(connectionInfo?.introducerOdinId);

  const {
    fetch: { data: identityIfollow, isFetched: followStateFetched },
  } = useIdentityIFollow({
    odinId,
  });

  if (!contact || !odinId) return null;

  const contactContent = contact?.fileMetadata.appData.content;
  const isConnected = connectionInfo?.status === 'connected';
  const isFollowing = !followStateFetched ? undefined : !!identityIfollow;

  return (
    <>
      <ErrorNotification error={refreshError || verifyError} />
      <Section
        title={
          <>
            <span className="flex flex-col gap-1">
              {t('Details')}

              {connectionInfo?.connectionRequestOrigin === 'introduction' ? (
                <p className="flex gap-1 text-sm">
                  <a
                    href={`${new OdinClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot()}${
                      isConnected && loggedOnIdentity ? '?youauth-logon=' + loggedOnIdentity : ''
                    }`}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="block text-sm text-primary hover:underline"
                  >
                    {odinId}
                  </a>
                  {connectionInfo?.introducerOdinId ? (
                    <>
                      {t('was introduced by')}
                      <a
                        href={`${new OdinClient({ hostIdentity: connectionInfo?.introducerOdinId, api: ApiType.Guest }).getRoot()}${
                          isConnectedWithIntroducer && loggedOnIdentity
                            ? '?youauth-logon=' + loggedOnIdentity
                            : ''
                        }`}
                        rel="noopener noreferrer"
                        target="_blank"
                        className="block text-sm text-primary hover:underline"
                      >
                        {connectionInfo?.introducerOdinId}
                      </a>
                    </>
                  ) : null}
                </p>
              ) : (
                <a
                  href={`${new OdinClient({ hostIdentity: odinId, api: ApiType.Guest }).getRoot()}${
                    isConnected && loggedOnIdentity ? '?youauth-logon=' + loggedOnIdentity : ''
                  }`}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block text-sm text-primary hover:underline"
                >
                  {odinId}
                </a>
              )}

              <CirclesSummary odinId={odinId} />
            </span>
          </>
        }
        actions={
          odinId &&
          contact?.fileId && (
            <ActionButton
              className="text-base"
              state={isConnected ? mergeStates(refreshState, verifyConnectionState) : refreshState}
              onClick={() => {
                refresh({ contact: contact as HomebaseFile<ContactFile> });
                if (isConnected) {
                  verifyConnection(odinId);
                }
              }}
              type="secondary"
              icon={Refresh}
            >
              {t('Refresh')}
            </ActionButton>
          )
        }
      >
        <div className="gap-4 sm:flex sm:flex-row">
          <div className="flex flex-row sm:mx-0">
            {odinId ? (
              <ContactImage
                odinId={odinId}
                className="mx-auto h-[12rem] w-[12rem] overflow-hidden rounded-md"
                canSave={true}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            {contactContent.name && (
              <div className="flex flex-row items-center">
                <IconFrame className="mr-2">
                  <Person className="h-4 w-4" />
                </IconFrame>
                <ContactName odinId={odinId} canSave={false} />
              </div>
            )}
            {contactContent.phone?.number ? (
              <div className="flex flex-row items-center">
                <IconFrame className="mr-2">
                  <Phone className="h-5 w-5" />
                </IconFrame>
                {contactContent.phone?.number ?? ''}
              </div>
            ) : null}
            {contactContent.email?.email ? (
              <div className="flex flex-row items-center">
                <IconFrame className="mr-2">
                  <Envelope className="h-5 w-5" />
                </IconFrame>
                {contactContent.email?.email ?? ''}
              </div>
            ) : null}
            {contactContent.location?.city || contactContent.location?.country ? (
              <div className="flex flex-row items-center">
                <IconFrame className="mr-2">
                  <House className="h-5 w-5" />
                </IconFrame>
                {contactContent.location?.city ?? ''} {contactContent.location?.country ?? ''}
              </div>
            ) : null}
            {contactContent.birthday?.date ? (
              <div className="flex flex-row items-center">
                <IconFrame className="mr-2">
                  <Cake className="h-5 w-5" />
                </IconFrame>
                {contactContent.birthday?.date ?? ''}
              </div>
            ) : null}
          </div>
          <div className="mt-5 flex flex-col-reverse gap-1 sm:ml-auto">
            {isConnected ? (
              <>
                <div className="flex flex-row items-center gap-2 sm:flex-row-reverse">
                  <ActionLink
                    icon={ChatBubble}
                    href={`/apps/chat/open/${odinId}`}
                    type="secondary"
                  />
                  <ActionLink
                    icon={Envelope}
                    href={`/apps/mail/new?recipients=${odinId}`}
                    type="secondary"
                  />
                  <ActionLink
                    icon={isFollowing ? Check : Feed}
                    href={`/owner/follow/following/${odinId}`}
                    type="secondary"
                    className={isFollowing ? 'opacity-40 hover:opacity-100' : ''}
                  >
                    {isFollowing ? t('Following') : t('Follow')}
                  </ActionLink>
                </div>
                <p className="text-sm text-slate-400">
                  {t('Reach out to')} {contactContent.name?.displayName ?? odinId}:
                </p>
              </>
            ) : null}
            {verifyConnectionState === 'success' ? (
              <p className="flex flex-row items-center gap-2">
                {verifyData ? (
                  <>
                    <Check className="h-5 w-5" /> {t('Verified')}
                  </>
                ) : (
                  <>
                    <Exclamation className="h-5 w-5" /> {t('Failed to verify')}
                  </>
                )}
              </p>
            ) : null}
          </div>
        </div>
      </Section>
    </>
  );
};

const CirclesSummary = ({ odinId }: { odinId?: string }) => {
  const { data: circles } = useCircles().fetch;

  const {
    fetch: { data: connectionInfo },
  } = useConnectionInfo({ odinId: odinId });

  const circleGrants =
    connectionInfo?.status === 'connected' &&
    (connectionInfo as ConnectionInfo).accessGrant.circleGrants;

  if (!circleGrants) return null;

  const circleNames = circleGrants
    .map((circleGrant) =>
      circles
        ?.find(
          (circle) =>
            stringGuidsEqual(circle.id, circleGrant.circleId) &&
            !stringGuidsEqual(circle.id, AUTO_CONNECTIONS_CIRCLE_ID) &&
            !stringGuidsEqual(circle.id, CONFIRMED_CONNECTIONS_CIRCLE_ID)
        )
        ?.name.toLocaleLowerCase()
    )
    .filter(Boolean) as string[];

  return (
    <Link
      to={`/owner/connections/${odinId}/settings/circles`}
      className="text-sm text-primary hover:underline"
    >
      {circleNames.length ? (
        <>
          {t('Member of')}:{' '}
          {circleNames.map(
            (name, index) =>
              name +
              (index < circleNames.length - 2 ? ', ' : index < circleNames.length - 1 ? ' & ' : '')
          )}
        </>
      ) : (
        t('Member of: None')
      )}
    </Link>
  );
};
