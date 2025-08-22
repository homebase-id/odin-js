import {ReactNode, useEffect, useMemo, useRef, useState} from 'react';
import {
  ConnectionImage,
  ConnectionName,
  formatDateExludingYearIfCurrent, SubtleMessage,
  t,
  useDotYouClient
} from '@homebase-id/common-app';
import {DealerShardConfig, verifyRemotePlayerShard} from '../../provider/auth/ShamirProvider';

export interface ShardVerificationResult { isValid: boolean; }
export interface VerifyRemotePlayerShardRequest { odinId: string; shardId: string; }

type Status = 'loading' | 'valid' | 'invalid' | 'error';

const toKey = (odinId: string) => odinId.toLowerCase();
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** initial backoff to avoid reporting red too early */
async function verifyWithRetry(
  getClient: () => any,
  req: VerifyRemotePlayerShardRequest,
  { maxAttempts = 3, baseDelayMs = 1200, jitterMs = 200 } = {},
): Promise<'valid' | 'invalid' | 'error'> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result: ShardVerificationResult | null =
        await verifyRemotePlayerShard(getClient(), req);
      if (result?.isValid) return 'valid';
      if (attempt === maxAttempts) return 'invalid';
    } catch {
      if (attempt === maxAttempts) return 'error';
    }
    const wait = baseDelayMs * attempt + Math.floor((Math.random() - 0.5) * 2 * jitterMs);
    await delay(Math.max(300, wait));
  }
  return 'error';
}

/** single immediate verification (used by manual retry) */
async function verifyOnce(
  getClient: () => any,
  req: VerifyRemotePlayerShardRequest,
): Promise<'valid' | 'invalid' | 'error'> {
  try {
    const result: ShardVerificationResult | null =
      await verifyRemotePlayerShard(getClient(), req);
    return result?.isValid ? 'valid' : 'invalid';
  } catch {
    return 'error';
  }
}

export const PlayerStatusList = ({ config }: { config: DealerShardConfig }) => {
  const [statusByOdin, setStatusByOdin] = useState<Record<string, Status>>({});
  const { getDotYouClient } = useDotYouClient();

  // derive odinId + shardId per envelope
  const targets = useMemo(() => {
    return (config.envelopes ?? [])
      .map((p: any) => {
        const odinId: string | undefined = p?.player?.odinId ?? undefined;
        const shardId: string | undefined = p?.shardId ?? p?.id ?? p?.player?.shardId ?? undefined;
        return odinId && shardId ? { odinId, shardId, key: toKey(odinId) } : null;
      })
      .filter(Boolean) as Array<{ odinId: string; shardId: string; key: string }>;
  }, [config.envelopes]);

  // quick map for lookup on retry
  const shardByKey = useMemo(() => {
    const m: Record<string, string> = {};
    for (const { key, shardId } of targets) m[key] = shardId;
    return m;
  }, [targets]);

  // track which players have started verification
  const startedRef = useRef<Set<string>>(new Set());

  // only block updates after unmount (not on re-render)
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => { unmountedRef.current = true; };
  }, []);

  // keep startedRef in sync (remove players that disappeared)
  useEffect(() => {
    const current = new Set(targets.map(t => t.key));
    for (const id of Array.from(startedRef.current)) {
      if (!current.has(id)) startedRef.current.delete(id);
    }
  }, [targets]);

  // manual retry: single call + spinner
  const runVerificationOnce = async (odinId: string, shardId: string) => {
    const k = toKey(odinId);
    setStatusByOdin(prev => ({ ...prev, [k]: 'loading' }));
    const status = await verifyOnce(getDotYouClient, { odinId, shardId });
    if (!unmountedRef.current) {
      setStatusByOdin(prev => ({ ...prev, [k]: status }));
    }
  };

  // initial batch verify with backoff, but only for players not started yet
  useEffect(() => {
    const toStart = targets.filter(({ key }) => !startedRef.current.has(key));
    if (!toStart.length) return;

    // mark loading only for new players
    setStatusByOdin(prev => ({
      ...prev,
      ...Object.fromEntries(toStart.map(({ key }) => [key, 'loading' as Status])),
    }));

    // mark started before kicking off
    toStart.forEach(({ key }) => startedRef.current.add(key));

    (async () => {
      await Promise.all(
        toStart.map(async ({ odinId, shardId, key }) => {
          const finalStatus = await verifyWithRetry(getDotYouClient, { odinId, shardId });
          if (!unmountedRef.current) {
            setStatusByOdin(prev => ({ ...prev, [key]: finalStatus }));
          }
        }),
      );
    })();
    // NOTE: no cleanup that flips a "cancelled" flag on re-render; we let in-flight updates finish.
  }, [targets, getDotYouClient]);

  return (
    <>
      {t('Created')}: {formatDateExludingYearIfCurrent(new Date(config.created))}
      <br/><br/>
      {t('Minimum matching Shards')}: {config.minMatchingShards}
      <SubtleMessage>
        {t('Minimum matching shards is the minimum number of shards that must be made ' +
          'available in the case you need to recover your account.')}
      </SubtleMessage>

      <br/>
      {t('Players')}
      <SubtleMessage>
        {t('Your connections who hold a shard of the data needed to recover your account.')}
      </SubtleMessage>
      <br/>

      {config.envelopes?.length ? (
        <div className="flex-grow overflow-auto">
          {config.envelopes.map((p: any, index: number) => {
            const odinId = (p?.player?.odinId as string) ?? undefined;
            const shardId = p?.shardId ?? p?.id ?? p?.player?.shardId ?? undefined;
            const key = odinId ? toKey(odinId) : undefined;
            const status: Status =
              (key && statusByOdin[key]) || (odinId ? 'loading' : 'error');

            return (
              <ConnectionListItem
                odinId={odinId}
                isActive={false}
                key={odinId || index}
                status={status}
                onRetry={() => { if (odinId && shardId) runVerificationOnce(odinId, shardId); }}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">{t('No players selected')}</p>
        </div>
      )}
    </>
  );
};

export const ConnectionListItem = ({
                                     odinId,
                                     status,
                                     onRetry,
                                     ...props
                                   }: {
  onClick?: () => void;
  odinId: string | undefined;
  isActive: boolean;
  status: Status;
  onRetry: () => void;
}) => {
  return (
    <ListItemWrapper {...props}>
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <div className="flex w-full items-center justify-between">
        <ConnectionName odinId={odinId}/>
        <div className="flex items-center gap-2">
          <StatusIcon status={status}/>
          {(status === 'invalid' || status === 'error') && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('Retry')}
            </button>
          )}
        </div>
      </div>
    </ListItemWrapper>
  );
};

const ListItemWrapper = ({
                           onClick,
                           isActive,
                           children,
                         }: {
  onClick?: () => void;
  isActive: boolean;
  children: ReactNode;
}) => (
  <div className="group px-2">
    <div
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-row items-center gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-primary/20 ${
        isActive ? 'bg-slate-200 dark:bg-slate-800' : 'bg-transparent'
      }`}
    >
      {children}
    </div>
  </div>
);

const StatusIcon = ({status}: { status: Status }) => {
  if (status === 'loading') {
    return (
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-label="Verifying…">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  if (status === 'valid') {
    return (
      <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" aria-label="Valid">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" aria-label="Invalid">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};
