import { MAIL_APP_ID, ExtendPermissionDialog, t } from '@youfoundation/common-app';
import { drives, permissions } from '../../hooks/auth/useAuth';
import { Helmet } from 'react-helmet-async';
import { MailThreads } from '../../components/Threads/MailThreads';
import { MailHomeHeader } from '../../components/Header/Header';
import { useParams, useSearchParams } from 'react-router-dom';
import { MailThreadsFilter } from '../../hooks/mail/useFilteredMailThreads';

export type MailFilterParams = {
  filter: MailThreadsFilter;
};

export const MailHome = () => {
  const { filter } = useParams<MailFilterParams>();
  const [searchParams] = useSearchParams();

  const query = searchParams.get('q');

  return (
    <>
      <Helmet>
        <title>Homebase | Mail</title>
      </Helmet>

      <ExtendPermissionDialog
        appName={t('Homebase Mail')}
        appId={MAIL_APP_ID}
        drives={drives}
        permissions={permissions}
      />

      <MailHomeHeader />
      <MailThreads filter={filter || 'inbox'} query={query || undefined} />
    </>
  );
};
