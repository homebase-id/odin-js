import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../../helpers/i18n/dictionary';
import useContacts from '../../../hooks/contacts/useContacts';
import { useIntersection } from '../../../hooks/intersection/useIntersection';
import useSettings from '../../../hooks/settings/useSettings';
import { ContactFile, RawContact } from '../../../provider/contact/ContactTypes';
import PendingConnectionImage from '../../../components/Connection/PendingConnectionImage/PendingConnectionImage';
import { AddressBook } from '@youfoundation/common-app';
import PageMeta from '../../../components/ui/Layout/PageMeta/PageMeta';

const Contacts = () => {
  const {
    data: contactPages,
    isLoading: isContactsLoading,
    hasNextPage,
    fetchNextPage,
  } = useContacts().fetch;
  const contacts = contactPages?.pages?.flatMap((page) => page.results);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useIntersection(
    hasNextPage ? loadMoreRef : undefined,
    () => {
      fetchNextPage();
    },
    true
  );

  return (
    <>
      <PageMeta icon={AddressBook} title={'Contacts'} />

      {isContactsLoading ? (
        <></>
      ) : contacts?.length ? (
        <div className="-m-1 flex flex-row flex-wrap">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              className="w-1/2 p-1 sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/6"
            />
          ))}
          <div ref={loadMoreRef} key="load-more" className="h-1 w-full"></div>
        </div>
      ) : (
        <>{t('No contacts in your contact book')}</>
      )}
    </>
  );
};

export default Contacts;

const ContactCard = ({
  contact,
  className,
}: {
  contact: ContactFile | RawContact;
  className: string;
}) => {
  const { data: uiSettings } = useSettings().fetchUiSettings;

  return (
    <div className={className}>
      <Link to={`/owner/contacts/${contact.odinId ?? contact.id}`}>
        <div
          className={`h-full rounded-md border border-gray-200 border-opacity-60 bg-white transition-colors hover:shadow-md dark:border-gray-800 dark:bg-gray-800 hover:dark:shadow-slate-600`}
        >
          {contact.odinId ? (
            <PendingConnectionImage
              odinId={contact.odinId}
              onlyLoadAfterClick={!uiSettings?.automaticallyLoadProfilePicture}
            />
          ) : null}
          <div className="p-2">
            <h2 className="font-thiner mb-6 dark:text-white">
              {contact.name
                ? contact.name.displayName ?? `${contact.name.givenName} ${contact.name.surname}`
                : ''}
            </h2>
          </div>
        </div>
      </Link>
    </div>
  );
};
