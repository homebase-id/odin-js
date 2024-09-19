import { useMailDraft } from '../../hooks/mail/useMailConversation';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MailComposer } from '../../components/Composer/MailComposer';
import { ROOT_PATH } from '../../app/App';
import { MailHomeHeader } from '../../components/Header/Header';

export const MailComposerPage = () => {
  const navigate = useNavigate();
  const { draftKey } = useParams();
  const [searchParams] = useSearchParams();
  const isDraft = !!draftKey;

  const { data: draftDsr } = useMailDraft(isDraft ? { draftFileId: draftKey } : undefined).getDraft;

  return (
    <>
      <MailHomeHeader />

      <section className="flex flex-grow flex-col md:mx-5 md:my-5">
        <div className="bg-background px-5 py-5">
          {isDraft ? (
            draftDsr ? (
              <MailComposer
                onDone={() => navigate(ROOT_PATH)}
                existingDraft={draftDsr}
                key={draftDsr.fileId}
              />
            ) : null
          ) : (
            <MailComposer
              onDone={() => navigate(ROOT_PATH)}
              recipients={searchParams.get('recipients')?.split(',')}
            />
          )}
        </div>
      </section>
    </>
  );
};
