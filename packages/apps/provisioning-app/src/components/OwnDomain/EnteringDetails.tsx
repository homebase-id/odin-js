import ActionButton from '../ui/Buttons/ActionButton';
import {t} from '../../helpers/i18n/dictionary';
import {validDomainRegEx} from '../../helpers/common';
import {
    OwnDomainProvisionState,
    useCreateOwnDomainZone,
    useFetchIsOwnDomainAvailable,
} from '../../hooks/ownDomain/useOwnDomain';
import {useFetchManagedDomainsApexes} from '../../hooks/managedDomain/useManagedDomain';
import {AlertError} from '../ErrorAlert/ErrorAlert';
import {Input, Label} from '@homebase-id/common-app';
import {Arrow, Exclamation} from '@homebase-id/common-app/icons';
import {useNavigate} from "react-router-dom";

interface Props {
    domain: string;
    setDomain: React.Dispatch<React.SetStateAction<string>>;
    email: string;
    setEmail: React.Dispatch<React.SetStateAction<string>>;
    setProvisionState: React.Dispatch<React.SetStateAction<OwnDomainProvisionState>>;
    invitationCode: string | null
}

const EnteringDetails = ({domain, setDomain, email, setEmail, setProvisionState, invitationCode}: Props) => {

    const navigate = useNavigate();

    //
    // API
    //
    const {
        data: isOwnDomainAvailable,
        error: errorIsOwnDomainAvailable,
        status: statusIsOwnDomainAvailable,
    } = useFetchIsOwnDomainAvailable(domain || '').fetchIsOwnDomainAvailable;

    const {
        fetchManagedDomainApexes: {data: managedDomainApexes},
    } = useFetchManagedDomainsApexes();

    const {
        createOwnDomainZone: {
            mutateAsync: createOwnDomainZone,
            error: createZoneError,
            status: createZoneStatus,
        },
    } = useCreateOwnDomainZone();

    //
    // RENDERING
    //

    return (
        <>
            <AlertError error={errorIsOwnDomainAvailable || createZoneError}/>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    e.currentTarget.reportValidity();

                    if (
                        e.currentTarget.checkValidity() &&
                        isOwnDomainAvailable &&
                        statusIsOwnDomainAvailable === 'success'
                    ) {
                        // Pre-provision the domain's DNS zone on our nameservers so the
                        // next step can offer NS delegation; inert until delegated
                        try {
                            await createOwnDomainZone({domain, invitationCode});
                        } catch {
                            // Error is surfaced via AlertError above
                            return;
                        }
                        setProvisionState('DnsRecords');
                    }

                    return false;
                }}
                className="max-w-3xl"
            >
                <div className="flex flex-row flex-wrap items-center">
                    <Label htmlFor="domain">{t('Your own domain')}</Label>
                    {isOwnDomainAvailable === false && domain ? (
                        <p className="order-1 ml-auto mt-2 flex flex-row items-center rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-700 md:order-none md:mt-0 md:rounded-b-none">
                            <Exclamation className="mr-2 h-5 w-5"/>
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
                        onChange={(e) => setDomain(e.target.value.toLowerCase())}
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
                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    />
                </div>

                <div className="mt-5 flex justify-between">

                    {managedDomainApexes && managedDomainApexes.length > 0 ? (
                        <ActionButton
                            type="secondary"
                            buttonType="button"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`../managed-domain${window.location.search}`);
                            }}>
                            {t('« Back')}
                        </ActionButton>
                    ) : <div />}

                    <ActionButton
                        className="h-[2.66rem]"
                        icon={Arrow}
                        isDisabled={!(isOwnDomainAvailable && statusIsOwnDomainAvailable === 'success')}
                        state={
                            createZoneStatus === 'pending'
                                ? 'loading'
                                : statusIsOwnDomainAvailable !== 'success'
                                    ? statusIsOwnDomainAvailable
                                    : undefined
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
