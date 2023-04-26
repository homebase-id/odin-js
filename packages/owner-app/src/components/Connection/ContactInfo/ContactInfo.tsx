import { t } from '../../../helpers/i18n/dictionary';
import useContact from '../../../hooks/contacts/useContact';
import useImage from '../../../hooks/media/useImage';
import { ContactConfig } from '../../../provider/contact/ContactTypes';
import ErrorNotification from '../../ui/Alerts/ErrorNotification/ErrorNotification';
import ActionButton from '../../ui/Buttons/ActionButton';
import FallbackImg from '../../ui/FallbackImg/FallbackImg';
import Cake from '../../ui/Icons/Cake/Cake';
import House from '../../ui/Icons/House/House';
import IconFrame from '../../ui/Icons/IconFrame/IconFrame';
import Person from '../../ui/Icons/Person/Person';
import Phone from '../../ui/Icons/Phone/Phone';
import Refresh from '../../ui/Icons/Refresh/Refresh';
import Section from '../../ui/Sections/Section';

interface ContactInfoProps {
  odinId?: string;
  contactId?: string;
}

const ContactInfo = ({ odinId, contactId }: ContactInfoProps) => {
  const {
    fetch: { data: contact },
    refresh: { mutate: refresh, status: refreshState, error: refreshError },
  } = useContact(odinId ? { odinId: odinId } : { id: contactId });

  return (
    <>
      <ErrorNotification error={refreshError} />
      <Section
        title={t('Details')}
        actions={
          odinId &&
          contact.id && (
            <ActionButton
              className="text-base"
              state={refreshState}
              onClick={() => refresh({ contact })}
              icon={Refresh}
              confirmOptions={{
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
            <ContactImage
              odinId={odinId}
              contactId={contactId}
              className="mx-auto h-[12rem] w-[12rem]"
            />
          </div>
          <div className="px-4">
            {contact?.name && (
              <div className="my-3 flex flex-row">
                <IconFrame className="mr-2">
                  <Person className="h-4 w-4" />
                </IconFrame>
                {contact.name.displayName ??
                  `${contact.name.givenName ?? ''} ${contact.name.surname ?? ''}`}
              </div>
            )}
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Phone className="h-4 w-4" />
              </IconFrame>{' '}
              {contact.phone?.number ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <House className="h-4 w-4" />
              </IconFrame>{' '}
              {contact.location?.city ?? ''} {contact.location?.country ?? ''}
            </div>
            <div className="my-3 flex flex-row">
              <IconFrame className="mr-2">
                <Cake className="h-4 w-4" />
              </IconFrame>{' '}
              {contact.birthday?.date ?? ''}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
};

interface ContactImageProps extends ContactInfoProps {
  className?: string;
}

export const ContactImage = ({ odinId, contactId, className }: ContactImageProps) => {
  const {
    fetch: { data: contact },
  } = useContact(odinId ? { odinId: odinId } : { id: contactId });

  const { data: imageUrl } = useImage(
    contact?.imageFileId || undefined,
    ContactConfig.ContactTargetDrive
  ).fetch;

  return (
    <>
      {contact?.imageUrl || imageUrl ? (
        <figure className={`relative overflow-hidden ${className ?? ''}`}>
          <img src={contact.imageUrl ?? imageUrl} className="aspect-square w-full object-cover" />
        </figure>
      ) : (
        <FallbackImg
          initials={
            contact?.name
              ? `${contact.name.givenName?.[0] ?? contact.name.displayName?.[0] ?? ''}${
                  contact.name.surname?.[0] ?? ''
                }`
              : ''
          }
          className={`${className ?? ''}`}
        />
      )}
    </>
  );
};

export default ContactInfo;
