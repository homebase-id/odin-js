import { useConnectionInfo } from './useConnectionInfo';

export const useIsConnected = (odinId?: string) => {
  const connectionInfoProps = useConnectionInfo({ odinId }).fetch;

  return {
    ...connectionInfoProps,
    data: connectionInfoProps.data
      ? connectionInfoProps.data.status.toLowerCase() === 'connected'
      : null,
  };
};
