import { useSearchParams } from 'react-router-dom';
import { RETURN_URL_PARAM } from '../../hooks/auth/useAuth';
import { getDomainFromUrl } from '@homebase-id/js-lib/helpers';
import { Helmet } from 'react-helmet-async';
import { MinimalLayout } from '../../components/ui/Layout/Layout';
import { useApp } from '../../hooks/apps/useApp';
import { CompanyImage } from '../../components/Connection/CompanyImage/CompanyImage';
import { useEffect, useMemo, useState } from 'react';
import DrivePermissionView from '../../components/PermissionViews/DrivePermissionView/DrivePermissionView';
import PermissionView from '../../components/PermissionViews/PermissionView/PermissionView';
import Section from '../../components/ui/Sections/Section';
import { t, Label, Select, ActionButton, DomainHighlighter } from '@homebase-id/common-app';
import { Arrow } from '@homebase-id/common-app/icons';

type AuthDuration = 'always' | 'for-1-year' | 'for-1-month' | 'for-1-week' | 'for-1-day' | 'never';

// https://frodo.dotyou.cloud/owner/youauth/consent?returnUrl=https%3A%2F%2Ffrodo.dotyou.cloud%2Fapi%2Fowner%2Fv1%2Fyouauth%2Fauthorize%3Fclient_id%3Dthirdparty.dotyou.cloud%26client_type%3Ddomain%26client_info%3D%26public_key%3DMIIBzDCCAWQGByqGSM49AgEwggFXAgEBMDwGByqGSM49AQECMQD%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252fv%252f%252f%252f%252f8AAAAAAAAAAP%252f%252f%252f%252f8wewQw%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f7%252f%252f%252f%252f%252fAAAAAAAAAAD%252f%252f%252f%252f8BDCzMS%252bn4j7n5JiOBWvj%252bC0ZGB2cbv6BQRIDFAiPUBOHWsZWOY2KLtGdKoXI7dPsKu8DFQCjNZJqoxmieh0AiWpnc6SCes2scwRhBKqHyiK%252biwU3jrHHHvMgrXRuHTtii6ebmFn3QeCCVCo4VQLyXb9VKWw6VF44cnYKtzYX3kqWJixvXZ6Yv5KS3Cn49B29KJoUfOnaMRO18LjACmCxzh1%252bgZ16Qx18kOoOXwIxAP%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f%252f8djTYH0Ny3fWBoNskiwp3rs7BlqzMUpcwIBAQNiAAR4FrrjXd5yPBMcqT9itSIha%252bQBrmHFNbkn3xBbuHUk%252fKM1Sb2MnKs9ZCMMlXyysxOddcpIaoM0EVCXkb66qe3Kr7bp0E38aMwSD6Wd5wx2qRTu7LDEmVh68nNe2ltDx3A%253d%26redirect_uri%3Dhttps%253a%252f%252fthirdparty.dotyou.cloud%253a7280%252fauthorization-code-callback%26permission_request%3D%26state%3Dbb45aa5d-7045-482c-a23a-e2b86449d660
const REDIRECT_URI_PARAM = 'redirect_uri';
const CLIENT_TYPE_PARAM = 'client_type';
const CLIENT_ID_PARAM = 'client_id';

const YouAuthConsent = () => {
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get(RETURN_URL_PARAM);
  const [name, setName] = useState<string | null>();
  const [duration, setDuration] = useState<AuthDuration>('never');

  if (!returnUrl) {
    console.error(
      'No returnUrl found, we cannot redirect back to the target domain... => Aborting youauth'
    );
    return null;
  }

  const returnUrlParams = new URL(returnUrl).searchParams;
  const clientType = returnUrlParams.get(CLIENT_TYPE_PARAM);
  const clientId = returnUrlParams.get(CLIENT_ID_PARAM);
  const targetReturnUrl = returnUrlParams.get(REDIRECT_URI_PARAM);
  const targetDomain = getDomainFromUrl(targetReturnUrl || undefined) || '';

  const doCancel = () =>
    (window.location.href = targetReturnUrl
      ? `${targetReturnUrl.split('?')[0]}?error=cancelled-by-user`
      : '/owner');

  const consentRequirements = useMemo(() => {
    if (clientType === 'app') return undefined;

    const expiration = new Date();

    switch (duration) {
      case 'always':
        return {
          consentRequirementType: 'never',
        };
      case 'never':
        return {
          consentRequirementType: 'always',
        };
      case 'for-1-year':
        expiration.setFullYear(expiration.getFullYear() + 1);
        break;
      case 'for-1-month':
        expiration.setMonth(expiration.getMonth() + 1);
        break;
      case 'for-1-week':
        expiration.setDate(expiration.getDate() + 7);
        break;
      case 'for-1-day':
        expiration.setDate(expiration.getDate() + 1);
        break;
    }

    return {
      consentRequirementType: 'expiring',
      expiration: expiration.getTime(),
    };
  }, [duration]);

  return (
    <>
      <Helmet>
        <title>{t('Login')} | Homebase</title>
      </Helmet>
      <MinimalLayout noShadedBg={true}>
        <section className="flex min-h-screen flex-col justify-center md:min-h-0 md:py-20">
          <div className="container mx-auto p-5">
            <div className="max-w-[35rem] dark:text-white">
              {clientType === 'app' ? (
                <AppDetails
                  appId={clientId || undefined}
                  targetDomain={targetDomain}
                  setName={setName}
                />
              ) : (
                <ServiceDetails targetDomain={targetDomain} />
              )}

              {clientType !== 'app' ? (
                <div className="my-auto mt-5 flex flex-col font-normal text-gray-600 dark:text-gray-300">
                  <Label htmlFor="duration">
                    {t('Auto-approve login requests from')} {name || targetDomain}
                  </Label>
                  <Select
                    name="duration"
                    defaultValue={duration}
                    onChange={(e) => setDuration(e.target.value as AuthDuration)}
                    className="mr-auto"
                  >
                    <option value="always">{t('Always')}</option>
                    <option value="for-1-year">{t('For 1 Year')}</option>
                    <option value="for-1-month">{t('For 1 Month')}</option>
                    <option value="for-1-week">{t('For 1 Week')}</option>
                    <option value="for-1-day">{t('For 1 Day')}</option>
                    <option value="never">{t('Ask Me Every Time')}</option>
                  </Select>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-2 sm:flex-row-reverse">
                <form action="/api/owner/v1/youauth/authorize" method="post" className="contents">
                  <input type="hidden" name="return_url" value={returnUrl} />
                  {consentRequirements ? (
                    <input
                      type="hidden"
                      name="consent_req"
                      value={JSON.stringify(consentRequirements)}
                    />
                  ) : null}
                  <ActionButton type="primary" className="w-full sm:w-auto" icon={Arrow} autoFocus>
                    {t('Login')}
                  </ActionButton>
                </form>

                <ActionButton type="secondary" onClick={doCancel} className="w-full sm:w-auto">
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

const ServiceDetails = ({ targetDomain }: { targetDomain: string }) => {
  return (
    <>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center">
        <CompanyImage
          domain={targetDomain}
          className="w-24 flex-shrink-0 overflow-hidden rounded-full sm:mr-4"
        />

        <h1 className="text-3xl md:text-4xl">
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
    </>
  );
};

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

const AppDetails = ({
  appId,
  targetDomain,
  setName,
}: {
  appId?: string;
  targetDomain: string;
  setName: (name: string) => void;
}) => {
  const [isDetails, setIsDetails] = useState(false);
  const { data: appRegistration } = useApp({ appId }).fetch;

  useEffect(() => {
    if (appRegistration?.name) setName(appRegistration?.name);
  }, [appRegistration]);

  return (
    <>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center">
        <CompanyImage
          domain={targetDomain}
          className="w-24 flex-shrink-0 overflow-hidden rounded-full sm:mr-4"
        />

        <h1 className="text-3xl md:text-4xl">
          {t('Login to')}{' '}
          {!appRegistration ? (
            <>
              &quot;
              <DomainHighlighter>{targetDomain}</DomainHighlighter>
              &quot;
            </>
          ) : (
            <>&quot;{appRegistration?.name}&quot;</>
          )}
        </h1>
      </div>

      <div className="dark:text-white dark:text-opacity-80">
        <p className="mt-2">
          {t('By logging in you allow')} &quot;
          {appRegistration?.name}&quot;{' '}
          {t('to verify your identity and personalise your experience')}
        </p>
      </div>
      {appRegistration ? (
        <div className="py-5">
          <button
            onClick={() => setIsDetails(!isDetails)}
            className={`flex flex-row items-center ${isDetails ? 'font-bold' : 'text-sm italic'}`}
          >
            {t('Details')}{' '}
            <Arrow
              className={`ml-2 h-5 w-5 transition-transform ${isDetails ? 'rotate-90' : ''}`}
            />
          </button>
          {isDetails ? (
            <>
              <p className="mt-2">
                &quot;{appRegistration.name}&quot; {t('is registered on your identity since')}{' '}
                <span className="italic">
                  {new Date(appRegistration.created).toLocaleDateString(undefined, dateFormat)}
                </span>{' '}
                {t('and has the following access on your identity')}:
              </p>
              {appRegistration.grant.permissionSet?.keys?.length ? (
                <Section>
                  <div className="flex flex-col gap-4">
                    {appRegistration.grant.permissionSet.keys.map((permissionLevel) => {
                      return (
                        <PermissionView key={`${permissionLevel}`} permission={permissionLevel} />
                      );
                    })}
                  </div>
                </Section>
              ) : null}
              {appRegistration.grant?.driveGrants ? (
                <Section>
                  <div className="flex flex-col gap-4">
                    {appRegistration.grant.driveGrants.map((grant) => {
                      return (
                        <DrivePermissionView
                          key={`${grant.permissionedDrive.drive.alias}-${grant.permissionedDrive.drive.type}`}
                          driveGrant={grant}
                        />
                      );
                    })}
                  </div>
                </Section>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

{
  /* <div className={`flex  ${isEditFriendlyName ? 'flex-col' : 'flex-row'}`}>
  <p className="flex flex-row items-center text-sm">
    <span>{t('Your current device:')}</span> {!isEditFriendlyName ? friendlyName : ''}
  </p>
  <div className="flex flex-row items-center">
    {isEditFriendlyName ? (
      <Input
        type="text"
        defaultValue={friendlyName}
        className="my-2 text-sm"
        onChange={(e) => setCustomFriendlyName(e.target.value)}
      />
    ) : null}

    <ActionButton
      icon={isEditFriendlyName ? Times : Pencil}
      onClick={() => setIsEditFriendlyName(!isEditFriendlyName)}
      type="mute"
    />
  </div>
</div> */
}

export default YouAuthConsent;
