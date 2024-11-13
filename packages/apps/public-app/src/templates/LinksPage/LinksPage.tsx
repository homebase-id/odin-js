import { Helmet } from 'react-helmet-async';
import { t } from '@homebase-id/common-app';
import Links from '../../components/ui/Layout/Links/Links';

const LinksPage = () => {
  return (
    <>
      <Helmet>
        <title>{t('Links')} | Homebase</title>
      </Helmet>

      <section className="py-5">
        <div className="container mx-auto max-w-3xl px-5">
          <Links direction={'col'} includeSocials={true} />
        </div>
      </section>
    </>
  );
};

export default LinksPage;
