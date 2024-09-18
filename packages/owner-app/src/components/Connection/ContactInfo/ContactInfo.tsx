import { useContact } from '../../../hooks/contacts/useContact';
import {
  t,
  useDotYouClient,
  ErrorNotification,
  ActionButton,
  ActionLink,
  mergeStates,
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
  Check,
  Exclamation,
} from '@homebase-id/common-app/icons';
import Section from '../../ui/Sections/Section';
import ContactImage from '../ContactImage/ContactImage';
import { ApiType, DotYouClient, HomebaseFile } from '@homebase-id/js-lib/core';
import { ContactFile } from '@homebase-id/js-lib/network';
import { useConnection } from '../../../hooks/connections/useConnection';
import { useVerifyConnection } from '../../../hooks/connections/useVerifyConnection';

interface ContactInfoProps {
  odinId?: string;
  contactId?: string;
}

const ContactInfo = ({ odinId, contactId }: ContactInfoProps) => {
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
  } = useConnection({ odinId: odinId });
  const { getIdentity } = useDotYouClient();

  const {
    fetch: { data: introducerConnectioInfo },
  } = useConnection({ odinId: connectionInfo?.introducerOdinId });

  if (!contact) return null;

  const contactContent = contact?.fileMetadata.appData.content;

  const isConnected = connectionInfo?.status === 'connected';
  const identity = getIdentity();

  const isConnectedWithIntroducer = introducerConnectioInfo?.status === 'connected';

  return (
    <>
      <ErrorNotification error={refreshError || verifyError} />
      <Section
        title={
          <>
            {t('Details')}

            {connectionInfo?.connectionRequestOrigin === 'introduction' ? (
              <p className="flex gap-1 text-sm">
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
                {t('was introduced by')}
                <a
                  href={`${new DotYouClient({ identity: connectionInfo?.introducerOdinId, api: ApiType.Guest }).getRoot()}${
                    isConnectedWithIntroducer && identity ? '?youauth-logon=' + identity : ''
                  }`}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block text-sm text-primary hover:underline"
                >
                  {connectionInfo?.introducerOdinId}
                </a>
              </p>
            ) : (
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
            )}
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
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex flex-row sm:mx-0">
            {odinId ? (
              <ContactImage
                odinId={odinId}
                className="mx-auto h-[12rem] w-[12rem]"
                canSave={true}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {contactContent.name && (
              <div className="flex flex-row items-center">
                <IconFrame className="mr-2">
                  <Person className="h-4 w-4" />
                </IconFrame>
                {contactContent.name.displayName ??
                  `${contactContent.name.givenName ?? ''} ${contactContent.name.surname ?? ''}`}
              </div>
            )}
            <div className="flex flex-row items-center">
              <IconFrame className="mr-2">
                <Phone className="h-4 w-4" />
              </IconFrame>
              {contactContent.phone?.number ?? ''}
            </div>
            <div className="flex flex-row items-center">
              <IconFrame className="mr-2">
                <Envelope className="h-4 w-4" />
              </IconFrame>
              {contactContent.email?.email ?? ''}
            </div>
            <div className="flex flex-row items-center">
              <IconFrame className="mr-2">
                <House className="h-4 w-4" />
              </IconFrame>
              {contactContent.location?.city ?? ''} {contactContent.location?.country ?? ''}
            </div>
            <div className="flex flex-row items-center">
              <IconFrame className="mr-2">
                <Cake className="h-4 w-4" />
              </IconFrame>
              {contactContent.birthday?.date ?? ''}
            </div>
          </div>
          <div className="ml-auto flex flex-col-reverse">
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

export default ContactInfo;
