import { Input, Label } from '@homebase-id/common-app';
import { Arrow, ArrowLeft, Shield } from '@homebase-id/common-app/icons';
import ActionButton from '../ui/Buttons/ActionButton';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import { IdentityPreviewCard } from './IdentityPreviewCard';
import { RegionPicker } from './RegionPicker';
import { t } from '../../helpers/i18n/dictionary';
import { useCreateManagedDomain } from '../../hooks/managedDomain/useManagedDomain';
import { Region, RegionSource, REGION_NAMES } from '../../helpers/region';

interface ConfirmIdentityProps {
  domainPrefix: string;
  domainApex: string;
  email: string;
  onEmailChange: (email: string) => void;
  region: Region | null;
  regionSource: RegionSource | null;
  onRegionChange: (region: Region) => void;
  invitationCode: string | null;
  onBack: () => void;
  onCreated: () => void;
}

const ConfirmIdentity = ({
  domainPrefix,
  domainApex,
  email,
  onEmailChange,
  region,
  regionSource,
  onRegionChange,
  invitationCode,
  onBack,
  onCreated,
}: ConfirmIdentityProps) => {
  const {
    createManagedDomain: { mutate: createManagedDomain, error, isPending },
  } = useCreateManagedDomain();

  return (
    <>
      <AlertError error={error} />

      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (!e.currentTarget.reportValidity() || !region || isPending) return;
          createManagedDomain(
            { domainPrefix, domainApex, invitationCode, region },
            { onSuccess: onCreated }
          );
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t(`You're claiming`)}
        </p>
        <p className="mt-1 break-all font-mono text-2xl font-semibold">
          {domainPrefix}
          <span className="text-slate-400 dark:text-slate-500">.{domainApex}</span>
        </p>

        <IdentityPreviewCard className="mt-5" domainPrefix={domainPrefix} apex={domainApex} />

        <div className="mt-5">
          <RegionPicker region={region} source={regionSource} onChange={onRegionChange} />
        </div>

        <div className="mt-8">
          <Label htmlFor="email">
            {t('Where can we reach you?')}
            <small className="block text-sm font-normal text-slate-500 dark:text-slate-400">
              {t(
                'Your email will be used to send you updates about the status of your identity setup'
              )}
            </small>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            placeholder="john@doe.com"
            onChange={(e) => onEmailChange(e.target.value.toLowerCase())}
          />
          <p className="mt-3 flex flex-row items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Shield className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              {t('Used only for setup and account recovery. Never shared, never marketing.')}
            </span>
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <ActionButton
            className="justify-center"
            size="large"
            icon={Arrow}
            buttonType="submit"
            isDisabled={!region || !email || isPending}
            state={isPending ? 'loading' : undefined}
          >
            {region
              ? t('Create my identity in {0}', t(REGION_NAMES[region]))
              : t('Create my identity')}
          </ActionButton>

          <ActionButton
            type="secondary"
            className="justify-center"
            icon={ArrowLeft}
            isDisabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
          >
            {t('Change my name')}
          </ActionButton>
        </div>
      </form>
    </>
  );
};

export default ConfirmIdentity;
