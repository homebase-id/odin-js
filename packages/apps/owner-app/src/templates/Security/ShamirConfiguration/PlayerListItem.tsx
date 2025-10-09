import {playerTypeText, ShamiraPlayer} from "../../../provider/auth/ShamirProvider";
import {ShardTrustLevel} from "../../../provider/auth/SecurityHealthProvider";
import {ConnectionImage, ConnectionName, t} from "@homebase-id/common-app";
import {ReactNode} from "react";

export type Status = "loading" | "valid" | "invalid" | "error";

export const PlayerListItem = ({
                                   player,
                                   status,
                                   trustLevel,
                                   isMissing,
                                   onRetry,
                                   ...props
                               }: {
    onClick?: () => void;
    player: ShamiraPlayer;
    isActive: boolean;
    status: Status;
    trustLevel: ShardTrustLevel | undefined;
    isMissing: boolean;
    onRetry: () => void;
}) => {
    return (
        <ListItemWrapper {...props}>
            <ConnectionImage
                odinId={player.odinId as string}
                className="border border-neutral-200 dark:border-neutral-800"
                size="sm"
            />

            <div className="flex w-full items-center justify-between">

                {/* Left: Player name */}
                <div>
                    <ConnectionName odinId={player.odinId as string}/>
                    <span className="ml-3 text-sm text-slate-400">({playerTypeText(player.type)})</span>
                </div>

                {/* Right: Verification + Trust + Retry */}
                <div className="flex flex-col md:flex-row md:items-center md:gap-6 gap-2 text-right">
                    {/* Verification status */}
                    <div className="flex items-center gap-2 justify-end">
                        <StatusIcon status={status}/>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            {status === "valid" && t("Shard verified")}
                            {status === "invalid" && t("Shard invalid")}
                            {status === "error" && t("Error verifying")}
                            {status === "loading" && t("Verifying...")}
            </span>
                    </div>

                    {trustLevel &&
                        <div
                            className={`flex items-center gap-2 justify-end text-sm ${
                                trustLevel === ShardTrustLevel.Critical && player.type === "delegate" || isMissing
                                    ? "text-red-600"
                                    : trustLevel === ShardTrustLevel.Medium
                                        ? "text-orange-600"
                                        : trustLevel === ShardTrustLevel.Low
                                            ? "text-yellow-600"
                                            : "text-green-600"
                            }`}
                        >
                            {trustEmoji(trustLevel)} {trustLabel(trustLevel, player.type)}
                            {isMissing && " (missing)"}
                        </div>
                    }

                    {/* Retry button */}
                    {(status === "invalid" || status === "error") && (
                        <div className="mt-1 md:mt-0">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRetry();
                                }}
                                className="text-xs text-blue-600 hover:underline"
                            >
                                {t("Retry Verification")}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ListItemWrapper>
    );
};

const ListItemWrapper = ({
                             onClick,
                             isActive,
                             children,
                         }: {
    onClick?: () => void;
    isActive: boolean;
    children: ReactNode;
}) => (
    <div className="group px-0 sm:px-2">
        <div
            onClick={onClick}
            className={`flex w-full cursor-pointer flex-row items-center gap-2 rounded-lg px-1 py-2 sm:gap-3 sm:px-3 sm:py-4 transition-colors hover:bg-primary/20 ${
                isActive ? "bg-slate-200 dark:bg-slate-800" : "bg-transparent"
            }`}
        >
            {children}
        </div>
    </div>
);



const StatusIcon = ({status}: { status: Status }) => {
    if (status === "loading") {
        return (
            <svg
                className="h-5 w-5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-label="Verifying…"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.25"
                />
                <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>
        );
    }
    if (status === "valid") {
        return (
            <svg
                className="h-5 w-5 text-green-600"
                viewBox="0 0 24 24"
                fill="none"
                aria-label="Valid"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                />
                <path
                    d="M8 12l3 3 5-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
            </svg>
        );
    }
    return (
        <svg
            className="h-5 w-5 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            aria-label="Invalid"
        >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path
                d="M9 9l6 6M15 9l-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
};

function trustEmoji(level: ShardTrustLevel): string {
    switch (level) {
        case ShardTrustLevel.High:
            return "✅";
        case ShardTrustLevel.Medium:
            return "⚠️";
        case ShardTrustLevel.Low:
            return "👀";
        case ShardTrustLevel.Critical:
            return "🚨";
        default:
            return "";
    }
}

function trustLabel(level: ShardTrustLevel, playerType: string): string {
    if (playerType === "automatic" && level === ShardTrustLevel.Critical) {
        return "Automatic (ok)";
    }

    switch (level) {
        case ShardTrustLevel.High:
            return "Active";
        case ShardTrustLevel.Medium:
            return "Inactive";
        case ShardTrustLevel.Low:
            return "Less active";
        case ShardTrustLevel.Critical:
            return "Unreachable";
        default:
            return "Unknown";
    }
}