import { AuthorName } from '../../socialFeed';

const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,25}(?::\d{1,5})?$/i;

/** An `@identity` mention: a link to the identity with its name when it is a domain, else plain text. */
export const Mention = ({ odinId }: { odinId: string }) =>
  domainRegex.test(odinId) ? (
    <a
      href={`https://${odinId}`}
      target="_blank"
      rel="noreferrer noopener"
      className="text-primary hover:underline break-words"
    >
      @<AuthorName odinId={odinId} excludeLink={true} />
    </a>
  ) : (
    <span className="break-all text-primary">@{odinId}</span>
  );
