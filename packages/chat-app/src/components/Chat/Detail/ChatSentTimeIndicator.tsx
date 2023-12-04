import { t } from '@youfoundation/common-app';
import { format } from '@youfoundation/common-app/src/helpers/timeago';
import { DriveSearchResult } from '@youfoundation/js-lib/core';
import { ChatMessage } from '../../../providers/ChatProvider';

export const ChatSentTimeIndicator = ({
  msg,
  className,
  isShort,
}: {
  msg: DriveSearchResult<ChatMessage>;
  className?: string;
  isShort?: boolean;
}) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <p className={`select-none text-sm text-foreground/70 ${className || ''}`}>{children}</p>
  );

  const date = new Date(msg.fileMetadata.created);
  if (!date) return <Wrapper>{t('Unknown')}</Wrapper>;

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  if (date > oneHourAgo)
    return <Wrapper>{format(date).replaceAll('ago', '').replaceAll('just', '')}</Wrapper>;

  // if date is not today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today) {
    const timeFormat: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
    };
    return <Wrapper>{date.toLocaleTimeString(undefined, timeFormat)}</Wrapper>;
  }

  // if date is this week
  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
  if (date >= thisWeek) {
    const weekdayFormat: Intl.DateTimeFormatOptions = {
      weekday: 'short',
    };
    return <Wrapper>{date.toLocaleDateString(undefined, weekdayFormat)}</Wrapper>;
  }

  const now = new Date();
  const yearsAgo = Math.abs(new Date(now.getTime() - date.getTime()).getUTCFullYear() - 1970);
  // const monthsAgo = Math.abs(now.getMonth() - date.getMonth());
  const dateTimeFormat: Intl.DateTimeFormatOptions = {
    month: isShort ? 'numeric' : 'short',
    day: 'numeric',
    // weekday: 'short',
    year: yearsAgo !== 0 ? 'numeric' : undefined,
    hour: isShort ? undefined : 'numeric',
    minute: isShort ? undefined : 'numeric',
  };
  return <Wrapper>{date.toLocaleDateString(undefined, dateTimeFormat)}</Wrapper>;
};
