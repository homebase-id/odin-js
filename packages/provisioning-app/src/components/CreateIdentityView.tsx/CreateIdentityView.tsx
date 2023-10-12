import { t } from '../../helpers/i18n/dictionary';
import ActionLink from '../ui/Buttons/ActionLink';
import {
  useDidDnsRecordsPropagate,
  useCanConnectToDomain,
  useCreateIdentity,
  useDomainHasValidCertificate,
} from '../../hooks/commonDomain/commonDomain';
import { Arrow, Check, Loader, Question } from '@youfoundation/common-app';
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

  const { data: didDnsRecordsPropagate } =
    useDidDnsRecordsPropagate(domain).fetchDidDnsRecordsPropagate;
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

  const canProvision = didDnsRecordsPropagate && canConnectToPort80 && canConnectToPort443;

  useEffect(() => {
    if (canProvision && createIdentityStatus === 'idle') doCreateIdentity();
  }, [didDnsRecordsPropagate, canConnectToPort80, canConnectToPort443]);

  const summarizedState = useMemo(() => {
    if (!didDnsRecordsPropagate) {
      return 'Waiting for DNS records to propagate';
    }
    if (!canConnectToPort80) {
      return 'Waiting for domain to accept connections on port 80';
    }
    if (!canConnectToPort443) {
      return 'Waiting for domain to accept connections on port 443';
    }
    if (!domainHasValidCertificate) {
      return 'Waiting for valid certificate on domain (this can take a while)';
    }

    return 'Creating your identity';
  }, [
    didDnsRecordsPropagate,
    canConnectToPort80,
    canConnectToPort443,
    createIdentityStatus,
    domainHasValidCertificate,
  ]);
  //

  return (
    <div>
      <AlertError error={createIdentityError} doRetry={() => doCreateIdentity} />

      <div className="flex flex-col justify-center">
        <div className="mx-auto mb-10 mt-20 flex w-full max-w-xl flex-col items-center text-center">
          {canProvision && !!firstRunToken ? (
            <>
              <p className="text-center">
                {t('Your identity')} {domain} {t('has been provisioned')}.
              </p>
              <ActionLink
                className="mt-10 h-[2.66rem]"
                href={`https://${domain}/owner/firstrun?frt=${firstRunToken}`}
                icon={Arrow}
              >
                {t('Go to your identity!')}
              </ActionLink>
            </>
          ) : (
            <>
              <Loader className="h-16 w-16" />
              <div className="mt-10 flex flex-col items-center">
                <p>{summarizedState}</p>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="ml-1 flex flex-row items-center text-sm underline"
                >
                  {t('Details')}
                  <Arrow
                    className={`h-4 w-4 transition-transform ${
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
          {didDnsRecordsPropagate ? (
            <p>
              <Check className="mr-2 inline-block h-8 w-8 rounded-lg bg-green-400 p-2 text-white" />
              DNS records for {domain} have propagated to major DNS resolvers
            </p>
          ) : (
            <p>
              <Question className="mr-2 inline-block h-8 w-8 rounded-lg bg-blue-400 p-2 text-white" />
              Waiting for DNS records for {domain} to propagate
            </p>
          )}
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

export default CreateIdentityView;
