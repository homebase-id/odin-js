import { t } from '../../helpers/i18n/dictionary';
import ActionLink from '../ui/Buttons/ActionLink';
import {
  useCanConnectToDomain,
  useCreateIdentity,
  useDomainHasValidCertificate,
} from '../../hooks/commonDomain/commonDomain';
import { Alert, Arrow, Check, Loader, Question } from '@youfoundation/common-app';
import { useEffect, useMemo, useState } from 'react';
import { AlertError } from '../ErrorAlert/ErrorAlert';

interface Props {
  domain: string;
  email: string;
  planId: string;
  invitationCode: string;
}

const CreateIdentityView = ({ domain, email, planId, invitationCode }: Props) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const { data: canConnectToPort80 } = useCanConnectToDomain(domain, 80).fetchCanConnectToDomain;
  const { data: canConnectToPort443 } = useCanConnectToDomain(domain, 443).fetchCanConnectToDomain;

  const {
    mutate: createIdentity,
    data: firstRunToken,
    status: createIdentityStatus,
    error: createIdentityError,
  } = useCreateIdentity().createIdentity;

  const {
    fetchDomainHasValidCertificate: { data: domainHasValidCertificate },
  } = useDomainHasValidCertificate(domain, createIdentityStatus !== 'idle');

  //

  const doCreateIdentity = () => createIdentity({ domain, email, planId, invitationCode });
  const canProvision = canConnectToPort80 && canConnectToPort443;

  useEffect(() => {
    if (canProvision && createIdentityStatus === 'idle') doCreateIdentity();
  }, [canConnectToPort80, canConnectToPort443]);

  const summarizedState = useMemo(() => {
    if (!canConnectToPort80) return 'Waiting for domain to accept connections on port 80';
    if (!canConnectToPort443) return 'Waiting for domain to accept connections on port 443';
    if (!domainHasValidCertificate)
      return 'Waiting for valid certificate on domain (this can take a while)';

    return 'Creating your identity';
  }, [canConnectToPort80, canConnectToPort443, createIdentityStatus, domainHasValidCertificate]);
  //

  return (
    <div>
      <AlertError error={createIdentityError} doRetry={() => doCreateIdentity} />

      <div className="flex flex-col justify-center">
        <div className="mx-auto mb-2 mt-20 flex w-full max-w-xl flex-col items-center text-center">
          {canProvision && !!firstRunToken ? (
            <>
              <p className="text-center text-3xl">
                {t('Your identity')} {domain} {t('has been provisioned')}
                <span className="ml-3">🎉</span>
              </p>
              <ActionLink
                className="mt-10 text-lg underline underline-offset-2"
                href={`https://${domain}/owner/firstrun?frt=${firstRunToken}`}
                icon={Arrow}
              >
                {domain}
              </ActionLink>

              <DomainAccessibleAlert domain={domain} />
            </>
          ) : (
            <>
              <Loader className="h-16 w-16" />
              <div className="mt-10 flex flex-col items-center gap-2">
                <p>{summarizedState}</p>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex flex-row items-center text-sm text-slate-500 underline underline-offset-2"
                >
                  {t('Details')}
                  <Arrow
                    className={`h-5 w-5 transition-transform ${
                      showDetails ? '-rotate-90' : 'rotate-90'
                    }`}
                  />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showDetails ? (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2 text-center">
          {canConnectToPort80 ? (
            <p>
              <Check className="mr-2 inline-block h-8 w-8 rounded-lg bg-green-400 p-2 text-white" />
              Domain is accepting connections on port 80
            </p>
          ) : (
            <p>
              <Question className="mr-2 inline-block h-8 w-8 rounded-lg bg-blue-400 p-2 text-white" />
              Waiting for domain to accept connections on port 80
            </p>
          )}
          {canConnectToPort443 ? (
            <p>
              <Check className="mr-2 inline-block h-8 w-8 rounded-lg bg-green-400 p-2 text-white" />
              Domain is accepting connections on port 443
            </p>
          ) : (
            <p>
              <Question className="mr-2 inline-block h-8 w-8 rounded-lg bg-blue-400 p-2 text-white" />
              Waiting for domain to accept connections on port 443
            </p>
          )}
          {createIdentityStatus !== 'idle' ? (
            domainHasValidCertificate ? (
              <p>
                <Check className="mr-2 inline-block h-8 w-8 rounded-lg bg-green-400 p-2 text-white" />
                Domain has valid certificate
              </p>
            ) : (
              <p>
                <Question className="mr-2 inline-block h-8 w-8 rounded-lg bg-blue-400 p-2 text-white" />
                Waiting for valid certificate on domain (this can take a few minutes)
              </p>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const DomainAccessibleAlert = ({ domain }: { domain: string }) => {
  const [isPinged, setPinged] = useState<boolean>(false);
  const [accessible, setAccessible] = useState<boolean>(false);

  useEffect(() => {
    fetch(`https://${domain}/api/guest/v1/auth/ident`)
      .then((response) => response.json())
      .then((validation) => validation?.odinId.toLowerCase() === domain && setAccessible(true))
      .catch()
      .finally(() => setPinged(true));
  }, [isPinged]);

  return isPinged && !accessible ? (
    <Alert type={'info'} isCompact={true} className="mt-10 text-left">
      <p>
        {t(
          `Although we have confirmed that your domain and identity is correctly setup and provisioned. Your identity might not be accessible yet, as it can take up to 24 hours for the DNS records to propagate.`
        )}
      </p>
    </Alert>
  ) : null;
};

export default CreateIdentityView;
