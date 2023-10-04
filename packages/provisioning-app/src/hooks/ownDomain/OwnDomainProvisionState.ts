type OwnDomainProvisionState =
  | 'EnteringDetails'
  | 'UpdatingDnsRecords'
  | 'ValidatingDnsRecords'
  | 'Provisioning'
  | 'Failed';

export default OwnDomainProvisionState;
