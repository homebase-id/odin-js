import TimeAgo from "timeago-react";
import {t} from "@homebase-id/common-app";

type TimeAgoUtcProps = {
  value: number | null;   // UTC timestamp in seconds
  emptyText?: string;     // shown if value is 0 or null
  className?: string;     // styling support
  locale?: string;        // optional locale pass-through
  live?: boolean;         // optional live update control
};

export function TimeAgoUtc({
                             value,
                             emptyText = t('Never'),
                             className,
                             locale,
                             live,
                           }: TimeAgoUtcProps) {
  if (!value) {
    return <span className={className}>{emptyText}</span>;
  }

  const date = new Date(value);
  return <TimeAgo datetime={date} className={className} locale={locale} live={live} />;
}
