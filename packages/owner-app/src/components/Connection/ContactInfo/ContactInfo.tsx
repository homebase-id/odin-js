import { useContact } from '../../../hooks/contacts/useContact';
import { t, useDotYouClient, ErrorNotification, ActionButton } from '@youfoundation/common-app';
import {
  Envelope,
  Cake,
  House,
  IconFrame,
  Person,
  Phone,
  Refresh,
} from '@youfoundation/common-app/icons';
import Section from '../../ui/Sections/Section';
import ContactImage from '../ContactImage/ContactImage';
import { ApiType, DotYouClient, HomebaseFile } from '@youfoundation/js-lib/core';
import { ContactFile } from '@youfoundation/js-lib/network';
import { useConnection } from '../../../hooks/connections/useConnection';

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
    fetch: { data: connectionInfo },
  } = useConnection({ odinId: odinId });
  const { getIdentity } = useDotYouClient();

  if (!contact) return null;

  const contactContent = contact?.fileMetadata.appData.content;

  const isConnected = connectionInfo?.status === 'connected';
  const identity = getIdentity();

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
            >
              {t('Refresh')}
            </ActionButton>
          )
        }
      >
        <div className="-mx-4 sm:flex sm:flex-row">
          <div className="flex flex-row px-4 sm:mx-0">
            {odinId ? (
              <ContactImage
                odinId={odinId}
                className="mx-auto h-[12rem] w-[12rem]"
                canSave={true}
              />
            ) : null}
          </div>
          <div className="px-4">
            {contactContent.name && (
              <div className="my-3 flex flex-row">
                <IconFrame className="mr-2">
                  <Person className="h-5 w-5" />
                </IconFrame>
                {contactContent.name.displayName ??
                  `${contactContent.name.givenName ?? ''} ${contactContent.name.surname ?? ''}`}
              </div>
            )}
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Phone className="h-5 w-5" />
              </IconFrame>
              {contactContent.phone?.number ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Envelope className="h-5 w-5" />
              </IconFrame>
              {contactContent.email?.email ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <House className="h-5 w-5" />
              </IconFrame>
              {contactContent.location?.city ?? ''} {contactContent.location?.country ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Cake className="h-5 w-5" />
              </IconFrame>
              {contactContent.birthday?.date ?? ''}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
};

export default ContactInfo;
