import { useEffect, useMemo } from 'react';
import { domainFromPrefixAndApex } from '../../helpers/common';
import { t } from '../../helpers/i18n/dictionary';
import {
  ManagedDomainProvisionState,
  useCreateManagedDomain,
} from '../../hooks/managedDomain/useManagedDomain';
import ActionButton from '../ui/Buttons/ActionButton';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import { Arrow, ArrowLeft } from '@youfoundation/common-app/icons';

interface CreateManagedDomainProps {
  domainPrefix: string;
  domainApex: string;
  setProvisionState: React.Dispatch<React.SetStateAction<ManagedDomainProvisionState>>;
}

const CreateManagedDomain = ({
  domainPrefix,
  domainApex,
  setProvisionState,
}: CreateManagedDomainProps) => {
  const {
    createManagedDomain: {
      status: createManagedDomainStatus,
      mutate: createManagedDomain,
      error: createManagedDomainError,
      isPending,
    },
  } = useCreateManagedDomain();

  // Domain from prefix and apex
  const domain = useMemo(
    () => domainFromPrefixAndApex(domainPrefix, domainApex),
    [domainPrefix, domainApex]
  );
  //

  useEffect(() => {
    if (createManagedDomainStatus === 'success') setProvisionState('Provisioning');
  }, [createManagedDomainStatus]);

  const doCreateManagedDomain = async () => await createManagedDomain({ domainPrefix, domainApex });

  const doCancel = () => setProvisionState('EnteringDetails');

  //

  return (
    <>
      <AlertError error={createManagedDomainError} />
      <div className="p-2">
        {t('Create managed domain')} <strong>{domain}</strong>?
        <small className="block text-sm">
          {t('You unique identity will be ')}
          {domain} {t('During the Alpha, this cannot be changed without creating a new identity.')}
        </small>
        <div className="mt-10 flex flex-row-reverse">
          <ActionButton
            className="h-[2.66rem]"
            icon={Arrow}
            isDisabled={isPending}
            onClick={() => doCreateManagedDomain()}
          >
            {t('Create my identity')}
          </ActionButton>
          <ActionButton
            className="mr-auto h-[2.66rem]"
            icon={ArrowLeft}
            isDisabled={isPending}
            onClick={() => doCancel()}
            type="secondary"
          >
            {t('Back')}
          </ActionButton>
        </div>
      </div>
    </>
  );
};

export default CreateManagedDomain;
