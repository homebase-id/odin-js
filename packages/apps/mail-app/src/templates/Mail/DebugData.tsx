import { ActionButton } from '@homebase-id/common-app';
import { useOdinClientContext } from '@homebase-id/common-app';
import { BePolite, MakeConversation } from '../../providers/DebugDataProvider';

export const DebugDataPage = () => {
  const odinClient = useOdinClientContext();
  return (
    <section className="flex flex-row justify-start gap-5 p-5">
      <ActionButton
        onClick={async () => {
          await MakeConversation(odinClient);
          alert('done!');
        }}
      >
        New conversations
      </ActionButton>
      <ActionButton
        onClick={async () => {
          await BePolite(odinClient);
          alert('done!');
        }}
      >
        Reply on existing
      </ActionButton>
    </section>
  );
};
