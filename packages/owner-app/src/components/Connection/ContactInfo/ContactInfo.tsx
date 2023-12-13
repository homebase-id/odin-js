import { Envelope, t } from '@youfoundation/common-app';
import { useContact } from '../../../hooks/contacts/useContact';
import { ErrorNotification } from '@youfoundation/common-app';
import { ActionButton } from '@youfoundation/common-app';
import { Cake, House, IconFrame, Person, Phone, Refresh } from '@youfoundation/common-app';
import Section from '../../ui/Sections/Section';
import ContactImage from '../ContactImage/ContactImage';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ContactFile } from '@youfoundation/js-lib/network';

interface ContactInfoProps {
  odinId?: string;
  contactId?: string;
}

const ContactInfo = ({ odinId, contactId }: ContactInfoProps) => {
  const {
    fetch: { data: contact },
    refresh: { mutate: refresh, status: refreshState, error: refreshError },
  } = useContact(odinId ? { odinId: odinId } : { id: contactId });

  if (!contact) return null;

  const contactContent = contact?.fileMetadata.appData.content;

  return (
    <>
      <ErrorNotification error={refreshError} />
      <Section
        title={t('Details')}
        actions={
          odinId &&
          contact?.fileMetadata.appData.uniqueId && (
            <ActionButton
              className="text-base"
              state={refreshState}
              onClick={() => refresh({ contact: contact as DriveSearchResult<ContactFile> })}
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
              <ContactImage odinId={odinId} className="mx-auto h-[12rem] w-[12rem]" />
            ) : null}
          </div>
          <div className="px-4">
            {contactContent.name && (
              <div className="my-3 flex flex-row">
                <IconFrame className="mr-2">
                  <Person className="h-4 w-4" />
                </IconFrame>
                {contactContent.name.displayName ??
                  `${contactContent.name.givenName ?? ''} ${contactContent.name.surname ?? ''}`}
              </div>
            )}
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Phone className="h-4 w-4" />
              </IconFrame>
              {contactContent.phone?.number ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Envelope className="h-4 w-4" />
              </IconFrame>
              {contactContent.email?.email ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <House className="h-4 w-4" />
              </IconFrame>
              {contactContent.location?.city ?? ''} {contactContent.location?.country ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Cake className="h-4 w-4" />
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
