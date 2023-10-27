import Input from '../Form/Input';
import Label from '../Form/Label';
import ActionButton from '../ui/Buttons/ActionButton';
import { t } from '../../helpers/i18n/dictionary';
import { validDomainRegEx } from '../../helpers/common';
import { useFetchIsOwnDomainAvailable } from '../../hooks/ownDomain/useOwnDomain';
import { OwnDomainProvisionState } from '../../hooks/ownDomain/OwnDomainProvisionState';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import { Arrow, Exclamation } from '@youfoundation/common-app';

interface Props {
  domain: string;
  setDomain: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  setProvisionState: React.Dispatch<React.SetStateAction<OwnDomainProvisionState>>;
}

const EnteringDetails = ({ domain, setDomain, email, setEmail, setProvisionState }: Props) => {
  //
  // API
  //
  const {
    data: isOwnDomainAvailable,
    error: errorIsOwnDomainAvailable,
    status: statusIsOwnDomainAvailable,
  } = useFetchIsOwnDomainAvailable(domain || '').fetchIsOwnDomainAvailable;

  //
  // RENDERING
  //

  return (
    <>
      <AlertError error={errorIsOwnDomainAvailable} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.currentTarget.reportValidity();

          if (
            e.currentTarget.checkValidity() &&
            isOwnDomainAvailable &&
            statusIsOwnDomainAvailable === 'success'
          )
            setProvisionState('DnsRecords');

          return false;
        }}
        className="max-w-3xl"
      >
        <div className="flex flex-row flex-wrap items-center">
          <Label htmlFor="domain">{t('Your own domain')}</Label>
          {isOwnDomainAvailable === false && domain ? (
            <p className="order-1 ml-auto mt-2 flex flex-row items-center rounded-lg bg-slate-100 px-2 py-1 md:order-none md:mt-0 md:rounded-b-none">
              <Exclamation className="mr-2 h-4 w-4" />
              {t(`This domain isn't available, try another one`)}
            </p>
          ) : null}
          <Input
            key="ownDomain"
            name="domain"
            type="text"
            required
            placeholder={t('your.domain.here')}
            defaultValue={domain}
            onKeyDown={(e) => e.key.match(validDomainRegEx) && e.preventDefault()}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>

        <div className="mt-8">
          <Label htmlFor="email">
            {t('Your email')}
            <small className="block text-sm font-normal text-slate-500">
              {t(
                'Your email will be used to send you updates about the status of your identity setup'
              )}
            </small>
          </Label>

          <Input
            name="email"
            type="email"
            required
            placeholder={t('someone@example.com')}
            defaultValue={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mt-5 flex flex-row-reverse">
          <ActionButton
            className="h-[2.66rem]"
            icon={Arrow}
            isDisabled={!(isOwnDomainAvailable && statusIsOwnDomainAvailable === 'success')}
            state={
              statusIsOwnDomainAvailable !== 'success' ? statusIsOwnDomainAvailable : undefined
            }
          >
            {t('Register your domain')}
          </ActionButton>
        </div>
      </form>
    </>
  );
};

export default EnteringDetails;
