import ActionButton from '../ui/Buttons/ActionButton';
import {t} from '../../helpers/i18n/dictionary';
import {useEffect, useMemo, useState} from 'react';
import {
    useFetchManagedDomainsApexes,
    useFetchIsManagedDomainAvailable,
    ManagedDomainApex,
    ManagedDomainProvisionState,
} from '../../hooks/managedDomain/useManagedDomain';
import {Arrow, Exclamation, Globe, Loader} from '@homebase-id/common-app/icons';
import {Input, Label, Select} from '@homebase-id/common-app';
import {domainFromPrefixAndApex, validDomainLabelRegEx} from '../../helpers/common';
import CreateManagedDomain from './CreateManagedDomain';
import {debounce} from 'lodash-es';
import {AlertError} from '../ErrorAlert/ErrorAlert';
import {useNavigate} from "react-router-dom";

interface EnteringDetailsProps {
    domain: string;
    setDomain: React.Dispatch<React.SetStateAction<string>>;
    setEmail: React.Dispatch<React.SetStateAction<string>>;
    provisionState: ManagedDomainProvisionState;
    setProvisionState: React.Dispatch<React.SetStateAction<ManagedDomainProvisionState>>;
    invitationCode: string | null;
}

const EnteringDetails = ({
                             provisionState,
                             setProvisionState,
                             domain,
                             setDomain,
                             setEmail,
                             invitationCode,
                         }: EnteringDetailsProps) => {
    const [prefixes, setPrefixes] = useState<string[]>([]); // array of prefixes in ui, e.g ['john', 'doe']
    const [domainApex, setDomainApex] = useState<ManagedDomainApex | undefined>(undefined);

    const domainPrefix = useMemo(() => {
        const hasAllPrefixes =
            prefixes.filter((x) => x.length > 0).length === domainApex?.prefixLabels.length;
        if (hasAllPrefixes) return prefixes.slice(0, domainApex?.prefixLabels.length).join('.');
        else return '';
    }, [prefixes, domainApex]);

    useEffect(() => {
        const hasAllPrefixes =
            prefixes.filter((x) => x.length > 0).length === domainApex?.prefixLabels.length;
        if (!hasAllPrefixes || !domainApex) {
            setDomain('');
        } else {
            setDomain(domainFromPrefixAndApex(domainPrefix, domainApex?.apex || ''));
        }
    }, [domainPrefix, domainApex]);

    //
    // API
    //

    const {
        fetchManagedDomainApexes: {data: managedDomainApexes, error: errorManagedDomainApexes},
    } = useFetchManagedDomainsApexes();

    const {
        fetchIsManagedDomainAvailable: {
            data: isManagedDomainAvailable,
            error: errorIsManagedDomainAvailable,
            status: isManagedDomainAvailableStatus,
        },
    } = useFetchIsManagedDomainAvailable(domainPrefix, domainApex?.apex || '');

    //
    // HOOKS
    //

    const navigate = useNavigate();

    // Initialize Apex on load
    useEffect(() => {
        if (!domainApex && managedDomainApexes && managedDomainApexes.length > 0) {
            const initialApex = managedDomainApexes[0];
            setDomainApex(initialApex);
            setPrefixes(Array(initialApex.prefixLabels.length).fill(''));
        }
    }, [domainApex, managedDomainApexes, setDomainApex]);

    //
    // FUNCTIONS
    //

    const onPrefixChange = (index: number, value: string) => {
        // Update prefix at index
        const newPrefixes = [...prefixes];
        newPrefixes[index] = value;
        setPrefixes(newPrefixes);
    };

    //
    // RENDERING
    //

    if (!domainApex) {
        return (
            <div className="w-1/2 p-2">
                <Loader className="mx-auto mb-10 h-20 w-20"/>
            </div>
        );
    }

    if (provisionState === 'EnteringDetails') {
        return (
            <>
                <AlertError error={errorManagedDomainApexes || errorIsManagedDomainAvailable}/>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (isManagedDomainAvailable && isManagedDomainAvailableStatus === 'success')
                            setProvisionState('CreatingManagedDomain');

                        return false;
                    }}
                    className="w-full max-w-5xl"
                >
                    <div className="flex flex-row flex-wrap items-center">
                        <Label>{t('Your domain')}</Label>
                        {isManagedDomainAvailable === false && domain ? (
                            <p className="order-1 ml-auto mt-2 flex flex-row items-center rounded-lg bg-slate-100 px-2 py-1 md:order-none md:mt-0 md:rounded-b-none">
                                <Exclamation className="mr-2 h-5 w-5"/>
                                {t(`This domain isn't available, try another one`)}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex w-full flex-col flex-wrap gap-2 md:flex-row">
                        {domainApex.prefixLabels.map((label, index) => (
                            <div className="flex-grow" key={index}>
                                <PrefixInput
                                    key={`prefix${index}`}
                                    name={`prefix${index}`}
                                    defaultValue={prefixes[index] || ''}
                                    placeholder={label}
                                    onChange={(e) => onPrefixChange(index, e.target.value.toLowerCase())}
                                />
                            </div>
                        ))}
                        <div className="flex-grow">
                            <Select
                                onChange={(e) => {
                                    if (managedDomainApexes) {
                                        const apex = managedDomainApexes?.find((x) => x.apex === e.target.value);
                                        setDomainApex(apex);
                                    }
                                }}
                                className="h-[2.56rem] border-b border-gray-300 focus:border-indigo-500 focus:ring-0 dark:border-gray-700"
                            >
                                {managedDomainApexes?.map((domain) => (
                                    <option key={domain.apex} value={domain.apex}>
                                        {domain.apex}
                                    </option>
                                ))}
                            </Select>
                        </div>
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
                            onChange={(e) => setEmail(e.target.value.toLowerCase())}
                        />
                    </div>
                    <div className="mt-5 flex justify-between">
                        <ActionButton
                            icon={Globe}
                            onClick={(e) => {
                                e.preventDefault();
                                navigate(`./own-domain?invitation-code=${invitationCode}`);
                            }}>
                            {t('Use your own domain')}
                        </ActionButton>

                        <ActionButton
                            isDisabled={
                                !(isManagedDomainAvailable === true && isManagedDomainAvailableStatus === 'success')
                            }
                            icon={Arrow}
                            state={
                                isManagedDomainAvailableStatus !== 'success'
                                    ? isManagedDomainAvailableStatus
                                    : undefined
                            }
                        >
                            {t('Register your identity')}
                        </ActionButton>
                    </div>
                </form>
            </>
        );
    } else {
        // CreatingManagedDomain (Confirm domain selection)
        return (
            <CreateManagedDomain
                domainApex={domainApex.apex}
                domainPrefix={domainPrefix}
                invitationCode={invitationCode}
                setProvisionState={setProvisionState}
            />
        );
    }
};

const PrefixInput = ({
                         name,
                         defaultValue,
                         placeholder,
                         onChange,
                     }: {
    name: string;
    defaultValue?: string;
    placeholder?: string;
    onChange: (e: { target: { name: string; value: string } }) => void;
}) => {
    const debouncedChange = useMemo(() => debounce(onChange, 500), [onChange]);

    return (
        <Input
            name={name}
            type="text"
            defaultValue={defaultValue}
            placeholder={placeholder}
            required
            onKeyDown={(e) => e.key.match(validDomainLabelRegEx) && e.preventDefault()}
            onChange={debouncedChange}
            onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                const newText = text.trim().replaceAll(/\s/g, '');
                e.currentTarget.value = newText;
                debouncedChange({target: {name, value: newText}});
                e.preventDefault();
            }}
            className="focus:outline-t-0 focus:outline-x-0 border-x-0 border-t-0 focus:ring-0"
        />
    );
};

export default EnteringDetails;
