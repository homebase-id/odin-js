import { useParams } from 'react-router-dom';

export const MailConversation = () => {
  const { conversationKey } = useParams();
  return <>{conversationKey}</>;
};
