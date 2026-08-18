import { Fragment, useEffect, useRef, useState } from 'react';
import { Label } from '@homebase-id/common-app';
import { Arrow, Globe } from '@homebase-id/common-app/icons';
import ActionButton from '../ui/Buttons/ActionButton';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import { StatusLine, StatusTone } from '../ui/StatusLine/StatusLine';
import { IdentityPreviewCard } from './IdentityPreviewCard';
import { t } from '../../helpers/i18n/dictionary';
import { config } from '../../app/config';
import {
  ManagedDomainApex,
  useFetchIsManagedDomainAvailable,
} from '../../hooks/managedDomain/useManagedDomain';
import {
  cleanLabel,
  cleanLabelInPlace,
  domainFromPrefixAndApex,
  MAX_DNS_LABEL_LENGTH,
} from '../../helpers/common';

const PLACEHOLDER_NAMES = ['john', 'doe'];

interface ClaimNameProps {
  apexes: ManagedDomainApex[];
  domainApex: ManagedDomainApex;
  onApexChange: (apex: ManagedDomainApex) => void;
  prefixes: string[];
  onPrefixesChange: (prefixes: string[]) => void;
  domainPrefix: string;
  apexesError: unknown;
  onClaim: () => void;
  onUseOwnDomain: () => void;
}

const ClaimName = ({
  apexes,
  domainApex,
  onApexChange,
  prefixes,
  onPrefixesChange,
  domainPrefix,
  apexesError,
  onClaim,
  onUseOwnDomain,
}: ClaimNameProps) => {
  const labelCount = domainApex.prefixLabels.length;
  const domain = domainFromPrefixAndApex(domainPrefix, domainApex.apex);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Debounce the value that drives the query key, not the change handler, so a
  // fast typist produces one lookup instead of one per keystroke
  const [debouncedPrefix, setDebouncedPrefix] = useState<string>(domainPrefix);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedPrefix(domainPrefix), 500);
    return () => clearTimeout(timeout);
  }, [domainPrefix]);

  const {
    fetchIsManagedDomainAvailable: { data: isAvailable, error: availabilityError, status },
  } = useFetchIsManagedDomainAvailable(debouncedPrefix, domainApex.apex);

  // Until the debounce catches up the result belongs to a name the user has
  // already moved on from
  const isSettled = debouncedPrefix === domainPrefix;
  const canClaim = !!domainPrefix && isSettled && status === 'success' && isAvailable === true;
  const isTaken = !!domainPrefix && isSettled && status === 'success' && isAvailable === false;

  // Gated on domainPrefix: the query is disabled until there is one, and a
  // disabled query reports 'pending' forever
  const isChecking = !!domainPrefix && (!isSettled || status === 'pending');

  const statusLine = ((): { tone: StatusTone; text: string } => {
    if (!domainPrefix)
      return {
        tone: 'idle',
        text:
          labelCount > 1
            ? t('Enter both parts of your name')
            : t('Only letters, numbers and hyphens'),
      };
    if (isChecking) return { tone: 'checking', text: t('Checking {0} …', domain) };
    if (status === 'error') return { tone: 'bad', text: t(`Couldn't check that name, try again`) };
    if (isAvailable) return { tone: 'ok', text: t('{0} is available', domain) };
    return { tone: 'bad', text: t('{0} is taken — try another name', domain) };
  })();

  // In-place cleaning keeps the caret where the user is typing; storing a transformed
  // value in a controlled input makes React rewrite input.value, jumping the caret to
  // the end (paste keeps plain cleanLabel - it replaces whole labels anyway)
  const onPrefixInput = (index: number, input: HTMLInputElement) => {
    const next = [...prefixes];
    next[index] = cleanLabelInPlace(input);
    onPrefixesChange(next);
  };

  const onApexSelect = (value: string) => {
    const next = apexes.find((apex) => apex.apex === value);
    if (!next) return;

    // Resize rather than keep: the server rejects a mismatched label count
    onPrefixesChange(
      Array.from({ length: next.prefixLabels.length }, (_, index) => prefixes[index] ?? '')
    );
    onApexChange(next);
  };

  return (
    <>
      <AlertError error={apexesError || availabilityError} />

      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          if (canClaim) onClaim();
        }}
      >
        <div className="flex flex-row flex-wrap items-baseline justify-between gap-2">
          <Label htmlFor="prefix0" className="mb-0">
            {t('Choose your name')}
          </Label>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {labelCount > 1 ? t('two parts, e.g. john.doe') : t('one word, e.g. john')}
          </span>
        </div>

        <div
          className={`mt-2 flex items-stretch overflow-hidden rounded-lg border bg-white transition-colors focus-within:ring-2 dark:bg-slate-900 ${
            isTaken
              ? 'border-red-500'
              : `border-gray-300 dark:border-gray-700 ${config.accentFocusClassName}`
          }`}
        >
          <div className="flex min-w-0 flex-1 items-center pl-3">
            {domainApex.prefixLabels.map((serverLabel, index) => (
              <Fragment key={index}>
                {index > 0 ? (
                  <span aria-hidden="true" className="select-none px-1 font-mono text-slate-400">
                    .
                  </span>
                ) : null}
                <input
                  id={`prefix${index}`}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  name={`prefix${index}`}
                  type="text"
                  value={prefixes[index] ?? ''}
                  // The server-provided label ("First name", "Surname", …) carries
                  // the meaning; the visible hint is only john/doe
                  aria-label={serverLabel}
                  placeholder={PLACEHOLDER_NAMES[index] ?? 'name'}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={MAX_DNS_LABEL_LENGTH}
                  required
                  className="w-full min-w-0 bg-transparent py-3 font-mono text-base text-gray-700 outline-none placeholder:text-slate-400 dark:text-gray-100 dark:placeholder:text-slate-500"
                  onChange={(e) => onPrefixInput(index, e.currentTarget)}
                  onKeyDown={(e) => {
                    if ((e.key === '.' || e.key === ' ') && index < labelCount - 1) {
                      e.preventDefault();
                      inputRefs.current[index + 1]?.focus();
                    }
                    if (e.key === 'Backspace' && !prefixes[index] && index > 0) {
                      inputRefs.current[index - 1]?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text').trim();
                    if (!pasted) return;
                    e.preventDefault();

                    // Someone pasting "john.doe" means to fill both boxes
                    const segments = pasted.split(/[.\s]+/).filter(Boolean);
                    const next = [...prefixes];
                    segments.slice(0, labelCount - index).forEach((segment, offset) => {
                      next[index + offset] = cleanLabel(segment);
                    });
                    onPrefixesChange(next);
                  }}
                />
              </Fragment>
            ))}
          </div>

          <div className="flex-none border-l border-gray-300 bg-slate-50 dark:border-gray-700 dark:bg-slate-800">
            <select
              aria-label={t('Domain ending')}
              value={domainApex.apex}
              onChange={(e) => onApexSelect(e.target.value)}
              className="h-full cursor-pointer bg-transparent px-3 py-3 font-mono text-base leading-6 text-gray-700 outline-none dark:text-gray-100"
            >
              {apexes.map((apex) => (
                <option key={apex.apex} value={apex.apex}>
                  .{apex.apex}
                </option>
              ))}
            </select>
          </div>
        </div>

        <StatusLine tone={statusLine.tone} className="min-h-[1.5rem]">
          {statusLine.text}
        </StatusLine>

        <IdentityPreviewCard className="mt-6" domainPrefix={domainPrefix} apex={domainApex.apex} />

        <div className="mt-6 flex flex-col gap-3">
          <ActionButton
            className="justify-center"
            size="large"
            icon={Arrow}
            buttonType="submit"
            isDisabled={!canClaim}
            state={isChecking ? 'loading' : undefined}
          >
            {canClaim ? t('Claim {0}', domain) : t('Claim your name')}
          </ActionButton>

          <ActionButton
            type="secondary"
            className="justify-center"
            icon={Globe}
            onClick={(e) => {
              e.preventDefault();
              onUseOwnDomain();
            }}
          >
            {t('Already own a domain? Use it instead')}
          </ActionButton>
        </div>
      </form>
    </>
  );
};

export default ClaimName;
