import { useConnection } from './useConnection';

export const useIsConnected = (odinId?: string) => {
  const connectionInfoProps = useConnection({ odinId }).fetch;

  return {
    ...connectionInfoProps,
    data: connectionInfoProps.data
      ? connectionInfoProps.data.status.toLowerCase() === 'connected'
      : null,
  };
};
