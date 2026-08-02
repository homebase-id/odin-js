import { Fragment, useEffect, useRef, useState } from 'react';
import { Arrow, Globe } from '@homebase-id/common-app/icons';
import ActionButton from '../ui/Buttons/ActionButton';
import { AlertError } from '../ErrorAlert/ErrorAlert';
import { IdentityPreviewCard } from './IdentityPreviewCard';
import { t } from '../../helpers/i18n/dictionary';
import {
  ManagedDomainApex,
  useFetchIsManagedDomainAvailable,
} from '../../hooks/managedDomain/useManagedDomain';
import { cleanLabel, domainFromPrefixAndApex, MAX_DNS_LABEL_LENGTH } from '../../helpers/common';

// Tinted example text in the name boxes. Indexed, so a single-label apex shows
// just "john" and a two-label apex shows "john" / "doe".
const PLACEHOLDER_NAMES = ['john', 'doe'];

const placeholderFor = (index: number) => PLACEHOLDER_NAMES[index] ?? 'name';

interface ClaimNameProps {
  apexes: ManagedDomainApex[];
  domainApex: ManagedDomainApex;
  onApexChange: (apex: ManagedDomainApex) => void;
  prefixes: string[];
  onPrefixesChange: (prefixes: string[]) => void;
  // Dotted prefix, empty until every label is filled in and valid
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

  // Debounce the *value* that drives the query key, rather than the change
  // handler, so a fast typist produces one lookup instead of one per keystroke
  const [debouncedPrefix, setDebouncedPrefix] = useState<string>(domainPrefix);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedPrefix(domainPrefix), 500);
    return () => clearTimeout(timeout);
  }, [domainPrefix]);

  const {
    fetchIsManagedDomainAvailable: { data: isAvailable, error: availabilityError, status },
  } = useFetchIsManagedDomainAvailable(debouncedPrefix, domainApex.apex);

  // While the debounce is still catching up, the query result belongs to a name
  // the user has already moved on from
  const isSettled = debouncedPrefix === domainPrefix;
  const canClaim = !!domainPrefix && isSettled && status === 'success' && isAvailable === true;
  const isTaken = !!domainPrefix && isSettled && status === 'success' && isAvailable === false;

  const statusLine = (() => {
    if (!domainPrefix)
      return {
        tone: 'idle' as const,
        text:
          labelCount > 1
            ? t('Enter both parts of your name')
            : t('Only letters, numbers and hyphens'),
      };
    if (!isSettled || status === 'pending')
      return { tone: 'checking' as const, text: `${t('Checking')} ${domain} …` };
    if (status === 'error')
      return { tone: 'bad' as const, text: t(`Couldn't check that name, try again`) };
    if (isAvailable) return { tone: 'ok' as const, text: `${domain} ${t('is available')}` };
    return { tone: 'bad' as const, text: `${domain} ${t('is taken — try another name')}` };
  })();

  const onPrefixInput = (index: number, raw: string) => {
    const next = [...prefixes];
    next[index] = cleanLabel(raw);
    onPrefixesChange(next);
  };

  const onApexSelect = (value: string) => {
    const next = apexes.find((apex) => apex.apex === value);
    if (!next) return;

    // Resize rather than keep: moving between a one-label and a two-label apex
    // must not leave a stale extra label behind, or the server rejects the
    // label count outright
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
          <label htmlFor="prefix0" className="font-medium">
            {t('Choose your name')}
          </label>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {labelCount > 1 ? t('two parts, e.g. john.doe') : t('one word, e.g. john')}
          </span>
        </div>

        <div
          className={`mt-2 flex items-stretch overflow-hidden rounded-lg border bg-white transition-colors focus-within:ring-2 focus-within:ring-indigo-300 dark:bg-slate-900 ${
            isTaken
              ? 'border-red-500'
              : 'border-gray-300 focus-within:border-indigo-500 dark:border-gray-700'
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
                  // The server-provided label ("First name", "Surname", …) still
                  // carries the meaning, even though the visible hint is john/doe
                  aria-label={serverLabel}
                  placeholder={placeholderFor(index)}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={MAX_DNS_LABEL_LENGTH}
                  required
                  className="w-full min-w-0 bg-transparent py-3 font-mono text-base text-gray-700 outline-none placeholder:text-slate-400 dark:text-gray-100 dark:placeholder:text-slate-500"
                  onChange={(e) => onPrefixInput(index, e.target.value)}
                  onKeyDown={(e) => {
                    // A dot or a space means "next box" — it's what people type
                    // when they think of this as one name
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
              className="h-full cursor-pointer bg-transparent px-3 py-3 font-mono text-sm text-gray-700 outline-none dark:text-gray-100"
            >
              {apexes.map((apex) => (
                <option key={apex.apex} value={apex.apex}>
                  .{apex.apex}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p
          role="status"
          aria-live="polite"
          className={`mt-2 flex min-h-[1.5rem] flex-row items-center gap-2 text-sm ${
            statusLine.tone === 'ok'
              ? 'text-green-600 dark:text-green-400'
              : statusLine.tone === 'bad'
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 flex-none rounded-full ${
              statusLine.tone === 'ok'
                ? 'bg-green-500'
                : statusLine.tone === 'bad'
                  ? 'bg-red-500'
                  : 'bg-slate-400'
            } ${statusLine.tone === 'checking' ? 'animate-pulse' : ''}`}
          />
          {statusLine.text}
        </p>

        <IdentityPreviewCard
          className="mt-6"
          domainPrefix={domainPrefix}
          apex={domainApex.apex}
          isLive={!!domainPrefix}
        />

        <div className="mt-6 flex flex-col gap-3">
          <ActionButton
            className="justify-center"
            size="large"
            icon={Arrow}
            isDisabled={!canClaim}
            state={!isSettled || status === 'pending' ? 'loading' : undefined}
          >
            {canClaim ? `${t('Claim')} ${domain}` : t('Claim your name')}
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
