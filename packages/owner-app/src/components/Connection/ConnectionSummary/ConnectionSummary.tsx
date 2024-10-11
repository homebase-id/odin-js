import { useContact } from '../../../hooks/contacts/useContact';
import {
  t,
  useDotYouClient,
  ErrorNotification,
  ActionButton,
  ActionLink,
  useIdentityIFollow,
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
  Feed,
  Check,
} from '@homebase-id/common-app/icons';
import Section from '../../ui/Sections/Section';
import ContactImage from '../ContactImage/ContactImage';
import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import { ContactFile } from '@homebase-id/js-lib/network';
import { useConnection } from '../../../hooks/connections/useConnection';

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
    fetch: { data: connectionInfo },
  } = useConnection({ odinId: odinId });
  const { getIdentity } = useDotYouClient();

  const {
    fetch: { data: identityIfollow, isFetched: followStateFetched },
  } = useIdentityIFollow({
    odinId,
  });

  if (!contact) return null;

  const contactContent = contact?.fileMetadata.appData.content;

  const isConnected = connectionInfo?.status === 'connected';
  const identity = getIdentity();

  const isFollowing = !followStateFetched ? undefined : !!identityIfollow;

  return (
    <>
      <ErrorNotification error={refreshError} />
      <Section
        title={
          <>
            {t('Details')}
            <a
              href={`${new DotYouClient({ identity: odinId, api: ApiType.Guest }).getRoot()}${
                isConnected && identity ? '?youauth-logon=' + identity : ''
              }`}
              rel="noopener noreferrer"
              target="_blank"
              className="block text-sm text-primary hover:underline"
            >
              {odinId}
            </a>
          </>
        }
        actions={
          odinId &&
          contact?.fileId && (
            <ActionButton
              className="text-base"
              state={refreshState}
              onClick={() => refresh({ contact: contact as HomebaseFile<ContactFile> })}
              icon={Refresh}
              confirmOptions={{
                type: 'info',
                title: t('Refresh data'),
                buttonText: t('Refresh'),
                body: t(
                  'Are you sure you want to refresh data, overwritten data cannot be recovered.'
                ),
              }}
              type="secondary"
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
                className="mx-auto h-[12rem] w-[12rem]"
                canSave={true}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            {contactContent.name && (
              <div className="flex flex-row items-center">
                <IconFrame className="mr-2">
                  <Person className="h-5 w-5" />
                </IconFrame>
                {contactContent.name.displayName ??
                  `${contactContent.name.givenName ?? ''} ${contactContent.name.surname ?? ''}`}
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
          {isConnected ? (
            <div className="mt-5 flex flex-col-reverse gap-1 sm:ml-auto">
              <div className="flex flex-row items-center gap-2 sm:flex-row-reverse">
                <ActionLink icon={ChatBubble} href={`/apps/chat/open/${odinId}`} type="secondary" />
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
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
};
