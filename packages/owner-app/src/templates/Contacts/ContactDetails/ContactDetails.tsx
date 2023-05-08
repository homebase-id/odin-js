///
/// !! Component replaced by connectionDetails as long as there is no real difference between a connection and a contact:
///

import ConnectionDetails from '../../Connections/ConnectionDetails/ConnectionDetails';

const ContactDetails = () => {
  return <ConnectionDetails />;
};

// import { useNavigate, useParams } from 'react-router-dom';
import { t } from '@youfoundation/common-app';
// import useConnection from '../../../../hooks/connections/useConnection';
// import useContact from '../../../../hooks/contacts/useContact';
// import useImage from '../../../../hooks/media/useImage';
// import { ContactConfig } from '../../../../provider/contact/ContactTypes';
// import { Alert } from '@youfoundation/common-app';
// import { ErrorNotification } from '@youfoundation/common-app';
// import ActionButton from '../../../Buttons/ActionButton';
// import FallbackImg from '../../../FallbackImg/FallbackImg';
// import { k } from '@youfoundation/common-app';;
// import { e } from '@youfoundation/common-app';;
// import { e } from '@youfoundation/common-app';;
// import { e } from '@youfoundation/common-app';;
// import { n } from '@youfoundation/common-app';;
// import { e } from '@youfoundation/common-app';;
// import PageMeta from '../../../Layout/PageMeta/PageMeta';
// import Section from '../../../Sections/Section';
// import { ConnectionPermissionViewer } from '../../Connections/ConnectionDetails/ConnectionDetails';

// const ContactDetails = () => {
//   const { odinId } = useParams();

//   const {
//     fetch: { data: contact, isLoading: isContactsLoading },
//     refresh: { mutate: refresh, status: refreshState, error: refreshError },
//   } = useContact({ id: odinId, odinId: odinId });

//   const { data: connectionInfo } = useConnection({ odinId: contact?.odinId }).fetch;

//   const { data: imageUrl } = useImage(
//     contact?.imageFileId || undefined,
//     ContactConfig.ContactTargetDrive
//   ).fetch;

//   const fullName = `${contact?.name?.givenName ?? ''} ${contact?.name?.surname ?? ''}`;

//   return (
//     <>
//       <ErrorNotification error={refreshError} />
//       <PageMeta
//         icon={AddressBook}
//         title={
//           <span className="flex flex-col">
//             <span className="block">{fullName}</span>
//             <small className="text-sm">{contact?.odinId}</small>
//           </span>
//         }
//         breadCrumbs={[{ href: '/owner/contacts', title: 'Contacts' }, { title: fullName }]}
//         actions={
//           contact?.odinId && (
//             <>
//               <ActionButton
//                 state={refreshState}
//                 onClick={() => refresh({ contact })}
//                 confirmOptions={{
//                   title: t('Refresh data'),
//                   buttonText: t('Refresh'),
//                   body: t(
//                     'Are you sure you want to refresh data, overwritten data cannot be recovered.'
//                   ),
//                 }}
//               >
//                 {t('Refresh')}
//               </ActionButton>
//             </>
//           )
//         }
//       />
//       {isContactsLoading ? (
//         <>Loading..</>
//       ) : !contact ? (
//         <>Not found</>
//       ) : (
//         <>
//           {connectionInfo?.status === 'blocked' && (
//             <>
//               <Alert type="critical">{t('This person has been blocked by you')}</Alert>
//             </>
//           )}

//           <Section isOpaqueBg={true} title={t('Details')}>
//             <div className="-mx-4 sm:flex sm:flex-row">
//               <div className="max-h-xs mx-auto max-w-xs px-4 sm:mx-0">
//                 {contact?.imageUrl || imageUrl ? (
//                   <figure className={'relative overflow-hidden'}>
//                     <img
//                       src={contact.imageUrl ?? imageUrl}
//                       className="aspect-square w-full object-cover"
//                     />
//                   </figure>
//                 ) : (
//                   <FallbackImg
//                     initials={
//                       contact.name ? `${contact.name.givenName[0]}${contact.name.surname[0]}` : ''
//                     }
//                     className="min-w-[10rem]"
//                   />
//                 )}
//               </div>
//               <div className="px-4">
//                 {contact.name && (
//                   <div className="my-3 flex flex-row">
//                     <IconFrame className="mr-2">
//                       <Person className="h-4 w-4" />
//                     </IconFrame>
//                     {contact.name.givenName ?? ''} {contact.name.surname ?? ''}
//                   </div>
//                 )}
//                 <div className="my-3 flex flex-row">
//                   <IconFrame className="mr-2">
//                     <Phone className="h-4 w-4" />
//                   </IconFrame>{' '}
//                   +12 34 56 78 90
//                 </div>
//                 <div className="my-3 flex flex-row">
//                   <IconFrame className="mr-2">
//                     <House className="h-4 w-4" />
//                   </IconFrame>{' '}
//                   Bag End, The Shire, Middle Earth
//                 </div>
//                 <div className="my-3 flex flex-row">
//                   <IconFrame className="mr-2">
//                     <Cake className="h-4 w-4" />
//                   </IconFrame>{' '}
//                   22nd of September
//                 </div>
//               </div>
//             </div>
//           </Section>

//           {connectionInfo?.status === 'connected' && (
//             <>
//               <h2 className="mt-11 text-2xl">{t('Connection details')}</h2>
//               <ConnectionPermissionViewer accessGrant={connectionInfo.accessGrant} />
//             </>
//           )}
//         </>
//       )}
//     </>
//   );
// };

export default ContactDetails;
