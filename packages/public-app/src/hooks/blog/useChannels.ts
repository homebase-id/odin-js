import {
  parseChannelTemplate as parseChannelTemplateCommon,
  ChannelDefinitionVm as ChannelDefinitionVmCommon,
  useChannels as useChannelsCommon,
} from '@youfoundation/common-app';
import useAuth from '../auth/useAuth';

export type ChannelDefinitionVm = ChannelDefinitionVmCommon;

export const parseChannelTemplate = parseChannelTemplateCommon;

const useChannels = () => {
  const { isAuthenticated, isOwner } = useAuth();

  return useChannelsCommon({ isAuthenticated, isOwner });
};

export default useChannels;
