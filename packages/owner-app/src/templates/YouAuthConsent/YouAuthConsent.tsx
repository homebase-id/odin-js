import { Helmet } from 'react-helmet-async';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import { ActionButton, Arrow, DomainHighlighter, t } from '@youfoundation/common-app';
import useAuth from '../../hooks/auth/useAuth';

const YouAuthConsent = () => {
  const strippedTarget = `somewhere.com`;
  const dotYouClient = useAuth().getDotYouClient();

  // const doPost = () => {
  //   const client = dotYouClient.createAxiosClient({ overrideEncryption: true });
  //   client.post('/api/youauth/authorize');
  // };

  return (
    <>
      <Helmet>
        <title>{t('Authorize')} | Odin</title>
      </Helmet>
      <MinimalLayout noShadedBg={true}>
        <section className="py-20">
          <div className="container mx-auto p-5">
            <div className="max-w-[35rem] dark:text-white">
              <form action="/api/owner/v1/api/youauth/authorize">
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center">
                  {/* <img
                  src={`https://${strippedTarget}/pub/image`}
                  className="w-24 rounded-full sm:mr-4"
                /> */}

                  <h1 className="text-4xl ">
                    {t('Login to')} &quot;<DomainHighlighter>{strippedTarget}</DomainHighlighter>
                    &quot;
                    <small className="block text-sm dark:text-white dark:text-opacity-80">
                      &quot;<DomainHighlighter>{strippedTarget}</DomainHighlighter>&quot;{' '}
                      {t('is requesting to verify your identity.')}
                    </small>
                  </h1>
                </div>

                <div className="dark:text-white dark:text-opacity-80">
                  <p className="mt-2">
                    {t('By logging in you allow')} &quot;
                    <DomainHighlighter>{strippedTarget}</DomainHighlighter>
                    &quot; {t('to verify your identity and personalise your experience')}
                  </p>
                </div>
                <div className="mt-10 flex flex-row-reverse">
                  <ActionButton
                    // onClick={() => doPost()}
                    type="primary"
                    className="ml-2 w-1/2 sm:w-auto"
                    icon={Arrow}
                  >
                    {t('Login')}
                  </ActionButton>
                  {/* <ActionButton type="secondary" onClick={doCancel} className="w-1/2 sm:w-auto">
                  {t('Cancel')}
                </ActionButton> */}
                </div>
              </form>
            </div>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};

export default YouAuthConsent;
