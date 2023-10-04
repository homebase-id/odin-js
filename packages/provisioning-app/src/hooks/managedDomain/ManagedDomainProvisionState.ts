type ManagedDomainProvisionState =
  | 'EnteringDetails'
  | 'CreatingManagedDomain'
  | 'Provisioning'
  | 'Failed';

export default ManagedDomainProvisionState;
