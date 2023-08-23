import { ActionButton, Arrow, DomainHighlighter, t } from '@youfoundation/common-app';
import { useSearchParams } from 'react-router-dom';
import { RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import { getDomainFromUrl } from '@youfoundation/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { MinimalLayout } from '../../components/ui/Layout/Layout';

// https://frodo.dotyou.cloud/owner/youauth/consent?returnUrl=https%3A%2F%2Ffrodo.dotyou.cloud%2Fapi%2Fowner%2Fv1%2Fyouauth%2Fauthorize%3Fclient_id%3Dthirdparty.dotyou.cloud%26client_type%3Ddomain%26client_info%3D%26public_key%3DMIIBzDCCAWQGByqGSM49AgEwggFXAgEBMDwGByqGSM49AQECMQD%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252fv%252f%252f%252f%252f8AAAAAAAAAAP%252f%252f%252f%252f8wewQw%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f7%252f%252f%252f%252f%252fAAAAAAAAAAD%252f%252f%252f%252f8BDCzMS%252bn4j7n5JiOBWvj%252bC0ZGB2cbv6BQRIDFAiPUBOHWsZWOY2KLtGdKoXI7dPsKu8DFQCjNZJqoxmieh0AiWpnc6SCes2scwRhBKqHyiK%252biwU3jrHHHvMgrXRuHTtii6ebmFn3QeCCVCo4VQLyXb9VKWw6VF44cnYKtzYX3kqWJixvXZ6Yv5KS3Cn49B29KJoUfOnaMRO18LjACmCxzh1%252bgZ16Qx18kOoOXwIxAP%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f8djTYH0Ny3fWBoNskiwp3rs7BlqzMUpcwIBAQNiAAR4FrrjXd5yPBMcqT9itSIha%252bQBrmHFNbkn3xBbuHUk%252fKM1Sb2MnKs9ZCMMlXyysxOddcpIaoM0EVCXkb66qe3Kr7bp0E38aMwSD6Wd5wx2qRTu7LDEmVh68nNe2ltDx3A%253d%26redirect_uri%3Dhttps%253a%252f%252fthirdparty.dotyou.cloud%253a7280%252fauthorization-code-callback%26permission_request%3D%26state%3Dbb45aa5d-7045-482c-a23a-e2b86449d660
const REDIRECT_URI_PARAM = 'redirect_uri';

const YouAuthConsent = () => {
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get(RETURN_URL_PARAM);
  if (!returnUrl) {
    console.error(
      'No returnUrl found, we cannot redirect back to the target domain... => Aborting youauth'
    );
    return null;
  }

  const targetReturnUrl = new URL(returnUrl).searchParams.get(REDIRECT_URI_PARAM);
  const targetDomain = getDomainFromUrl(targetReturnUrl || undefined) || '';

  const doCancel = () => (window.location.href = returnUrl);

  return (
    <>
      <Helmet>
        <title>{t('Login')} | Odin</title>
      </Helmet>
      <MinimalLayout noShadedBg={true}>
        <section className="py-20">
          <div className="container mx-auto p-5">
            <div className="max-w-[35rem] dark:text-white">
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center">
                <img
                  src={`https://${targetDomain}/pub/image`}
                  className="w-24 rounded-full sm:mr-4"
                />

                <h1 className="text-4xl ">
                  {t('Login to')} &quot;<DomainHighlighter>{targetDomain}</DomainHighlighter>
                  &quot;
                  <small className="block text-sm dark:text-white dark:text-opacity-80">
                    &quot;<DomainHighlighter>{targetDomain}</DomainHighlighter>&quot;{' '}
                    {t('is requesting to verify your identity.')}
                  </small>
                </h1>
              </div>

              <div className="dark:text-white dark:text-opacity-80">
                <p className="mt-2">
                  {t('By logging in you allow')} &quot;
                  <DomainHighlighter>{targetDomain}</DomainHighlighter>&quot;{' '}
                  {t('to verify your identity and personalise your experience')}
                </p>
              </div>
              <div className="mt-10 flex flex-row-reverse">
                {/* TODO: Check if this would be better with a normal XHR request... Having a form is pretty uncommon, and doesn't add anything in terms of security */}
                <form action="/api/owner/v1/youauth/authorize" method="post">
                  <input type="hidden" name="return_url" value={returnUrl} />
                  <ActionButton type="primary" className="ml-2 w-1/2 sm:w-auto" icon={Arrow}>
                    {t('Login')}
                  </ActionButton>
                </form>

                <ActionButton type="secondary" onClick={doCancel} className="w-1/2 sm:w-auto">
                  {t('Cancel')}
                </ActionButton>
              </div>
            </div>
          </div>
        </section>
      </MinimalLayout>
    </>
  );
};
export default YouAuthConsent;
