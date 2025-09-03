import {
  ConnectionImage, ConnectionName,
  Label, SubtleMessage,
  t,
} from '@homebase-id/common-app';
import {ReactNode} from 'react';
import {ConfigureShardsRequest} from "../../../provider/auth/ShamirProvider";

export const DistributeShards = ({config}: {
  config: ConfigureShardsRequest;
}) => {

  return (
    <>
      <Label>
        {t('Review')}
      </Label>

      {t('Minimum matching Shards')} : {config.minMatchingShards}
      <SubtleMessage>
        {t('Minimum matching shards is the minimum number of shards that must be made ' +
          'available in the case you need to recover your account.')}
      </SubtleMessage>
      <br/>
      <br/>
      <br/>

      Players
      <br/>
      {config.players?.length ? (
        <div className="flex-grow overflow-auto">
          {config.players.map((p, index) => (
            <ConnectionListItem
              odinId={p.odinId as string}
              isActive={false}
              key={p.odinId || index}
              onClick={() => {
                if (!p.odinId) return;
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-grow items-center justify-center p-5">
          <p className="text-slate-400">{t('Select trusted connections from list below')}</p>
        </div>
      )}
    </>
  );
};

export const ConnectionListItem = ({
                                     odinId,
                                     ...props
                                   }: {
  onClick: (() => void) | undefined;
  odinId: string | undefined;
  isActive: boolean;
}) => {
  return (
    <ListItemWrapper {...props}>
      <ConnectionImage
        odinId={odinId}
        className="border border-neutral-200 dark:border-neutral-800"
        size="sm"
      />
      <ConnectionName odinId={odinId}/>
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
