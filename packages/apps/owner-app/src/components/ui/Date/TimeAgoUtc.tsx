import TimeAgo from "timeago-react";
import {t} from "@homebase-id/common-app";
import { format, register } from "timeago.js";

type TimeAgoUtcProps = {
  value: number | null;   // UTC timestamp in seconds
  emptyText?: string;     // shown if value is 0 or null
  className?: string;     // styling support
  locale?: string;        // optional locale pass-through
  live?: boolean;         // optional live update control
};

const customFormatter = (value: number, unit: string, suffix: string) => {
  if (unit === "second") {
    return "just now";
  }
  return `${value} ${unit}${value > 1 ? "s" : ""} ${suffix}`;
};

register("no-seconds", customFormatter);

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
