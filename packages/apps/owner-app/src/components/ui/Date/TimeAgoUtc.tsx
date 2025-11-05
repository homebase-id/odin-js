import {
    formatToDateAgoWithRelativeDetail,
    formatToTimeAgo, formatToTimeAgoWithRelativeDetail,
    t
} from "@homebase-id/common-app";

type TimeAgoUtcProps = {
    value: number | null;                 // UTC timestamp in ms
    emptyText?: string;                   // shown if value is 0 or null
    className?: string;                   // styling support
    showAbsolute?: boolean;               // also render absolute date in parentheses
    absoluteFormat?: "date" | "datetime"; // choose date or date+time
};

export function TimeAgoUtc({
                               value,
                               emptyText = t("Never"),
                               className,
                               showAbsolute = false,
                               absoluteFormat = "date",
                           }: TimeAgoUtcProps) {
    if (!value) {
        return <span className={className}>{emptyText}</span>;
    }

    const date = new Date(value);

    const relative = formatToTimeAgo(date);
    let absolute: string | undefined;
    
    if (showAbsolute) {
        absolute =
            absoluteFormat === "datetime"
                ? formatToDateAgoWithRelativeDetail(date) // absolute w/ time detail
                : formatToTimeAgoWithRelativeDetail(date)
        
        
    }

    return (
        <span className={className}>
      {relative}
            {absolute && <span className="ml-1 text-slate-500">({absolute})</span>}
    </span>
    );
}
