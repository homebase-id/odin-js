import { ActionButton } from '@youfoundation/common-app';
import { useDotYouClientContext } from '@youfoundation/common-app';
import { BePolite, MakeConversation } from '../../providers/DebugDataProvider';

export const DebugDataPage = () => {
  const dotYouClient = useDotYouClientContext();
  return (
    <section className="flex flex-row justify-start gap-5 p-5">
      <ActionButton
        onClick={async () => {
          await MakeConversation(dotYouClient);
          alert('done!');
        }}
      >
        New conversations
      </ActionButton>
      <ActionButton
        onClick={async () => {
          await BePolite(dotYouClient);
          alert('done!');
        }}
      >
        Reply on existing
      </ActionButton>
    </section>
  );
};
