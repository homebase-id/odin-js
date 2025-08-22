import {ReactNode, useEffect, useMemo, useState} from 'react';
import {ConnectionImage, ConnectionName, t, useDotYouClient} from '@homebase-id/common-app';
import {DealerShardConfig, verifyRemotePlayerShard} from '../../provider/auth/ShamirProvider';

// Optional: if you have these types available elsewhere, use those instead:
export interface ShardVerificationResult {
  isValid: boolean;
}

export interface VerifyRemotePlayerShardRequest {
  odinId: string;
  shardId: string;
}

type Status = 'loading' | 'valid' | 'invalid' | 'error';

export const PlayerStatusList = ({config}: { config: DealerShardConfig }) => {
  const [statusByOdin, setStatusByOdin] = useState<Record<string, Status>>({});

  // Extract what we need safely; try a few common keys for shardId
  const targets = useMemo(() => {
    return (config.envelopes ?? [])
      .map((p: any) => {
        const odinId: string | undefined = p?.player?.odinId ?? undefined;
        const shardId: string | undefined =
          p?.shardId ?? p?.id ?? p?.player?.shardId ?? undefined;
        return odinId && shardId ? {odinId, shardId} : null;
      })
      .filter(Boolean) as Array<{ odinId: string; shardId: string }>;
  }, [config.envelopes]);


  const {getDotYouClient} = useDotYouClient();

  useEffect(() => {
    if (!targets.length) return;

    // Initialize to loading for all targets
    setStatusByOdin((prev) => ({
      ...prev,
      ...Object.fromEntries(targets.map(({odinId}) => [odinId, 'loading' as Status])),
    }));

    let cancelled = false;

    (async () => {
      await Promise.all(
        targets.map(async ({odinId, shardId}) => {
          try {
            const result: ShardVerificationResult | null = await verifyRemotePlayerShard(getDotYouClient(), {
              odinId,
              shardId,
            } as VerifyRemotePlayerShardRequest);

            if (cancelled) return;
            setStatusByOdin((prev) => ({
              ...prev,
              [odinId]: result?.isValid ? 'valid' : 'invalid',
            }));
          } catch {
            if (cancelled) return;
            setStatusByOdin((prev) => ({...prev, [odinId]: 'error'}));
          }
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [targets]);

  return (
    <>
      Min Shards: {config.minMatchingShards}
      <br/>
      Players
      <br/>
      {config.envelopes?.length ? (
        <div className="flex-grow overflow-auto">
          {config.envelopes.map((p: any, index: number) => {
            const odinId = (p?.player?.odinId as string) ?? undefined;
            const status: Status =
              (odinId && statusByOdin[odinId]) || (odinId ? 'loading' : 'error');

            return (
              <ConnectionListItem
                odinId={odinId}
                isActive={false}
                key={odinId || index}
                status={status}
                onClick={() => {
                  if (!odinId) return;
                }}
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
                                     conversationId,
                                     status,
                                     ...props
                                   }: {
  onClick: (() => void) | undefined;
  odinId: string | undefined;
  conversationId?: string;
  isActive: boolean;
  status: 'loading' | 'valid' | 'invalid' | 'error';
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
        <StatusIcon status={status}/>
      </div>
    </ListItemWrapper>
  );
};

const ListItemWrapper = ({
                           onClick,
                           isActive,
                           children,
                         }: {
  onClick: (() => void) | undefined;
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

// Minimal, dependency-free icons (SVG)
const StatusIcon = ({status}: { status: Status }) => {
  if (status === 'loading') {
    return (
      <svg
        className="h-5 w-5 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-label="Verifying…"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25"/>
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
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

  // invalid or error -> red X
  return (
    <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" aria-label="Invalid">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
};
