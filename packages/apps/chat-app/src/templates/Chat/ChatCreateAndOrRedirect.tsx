import { useParams, Navigate } from 'react-router-dom';
import { useConversation } from '../../hooks/chat/useConversation';
import { Loader } from '@homebase-id/common-app/icons';
import { useEffect } from 'react';
import { CHAT_ROOT_PATH, ErrorNotification } from '@homebase-id/common-app';

export const ChatCreateAndOrRedirect = () => {
  const { odinId } = useParams();
  const { mutate, data: createResult, error: createError } = useConversation().create;

  useEffect(() => {
    if (!odinId) return;
    mutate({ recipients: [odinId], imagePayload: undefined });
  }, []);

  if (!odinId) return <Navigate to={`${CHAT_ROOT_PATH}`} />;

  if (createResult?.newConversationId)
    return <Navigate to={`${CHAT_ROOT_PATH}/${createResult.newConversationId}`} />;

  return (
    <div className="h-screen">
      <ErrorNotification error={createError} />
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col p-5">
        <div className="my-auto flex flex-col">
          <Loader className="mx-auto mb-10 h-20 w-20" />
        </div>
      </div>
    </div>
  );
};
