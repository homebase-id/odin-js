import {DealerRecoveryRiskReport, RecoveryRiskLevel, ShardTrustLevel} from "../../provider/auth/SecurityHealthProvider";

export function DealerRecoveryRiskOverview({ report }: { report: DealerRecoveryRiskReport }) {
    let headline: string;

    switch (report.riskLevel.toLowerCase()) {
        case "low":
            headline = "✅🤗 Recovery key is safe";
            break;
        case "moderate":
            headline = "👀⚠️ Some shards are stale";
            break;
        case "high":
            headline = "🚨 Recovery at risk";
            break;
        case "critical":
            headline = "💀 Recovery not possible";
            break;
        default:
            headline = "ℹ️ Recovery status unknown";
            break;
    }

    return headline;
    
    // return (
    //     <div className="p-4 rounded-lg border space-y-4">
    //         <h2 className="text-lg font-semibold">{headline}</h2>

            {/*<p>*/}
            {/*    {report.validShardCount} of {report.minRequired} required shards available*/}
            {/*</p>*/}
            
            {/*<ul className="list-disc pl-6 space-y-1">*/}
            {/*    {report.players.map(player => (*/}
            {/*        <li key={player.playerId}>*/}
            {/*            {player.isMissing*/}
            {/*                ? `❌ ${player.playerId} — Missing`*/}
            {/*                : player.isValid*/}
            {/*                    ? `${trustEmoji(player.trustLevel)} ${player.playerId} — ${player.trustLevel}`*/}
            {/*                    : `❌ ${player.playerId} — Invalid`}*/}
            {/*        </li>*/}
            {/*    ))}*/}
            {/*</ul>*/}

    //         <ActionPrompt riskLevel={report.riskLevel} />
    //     </div>
    // );
}

function trustEmoji(level: ShardTrustLevel): string {
    switch (level) {
        case ShardTrustLevel.Thumbsup: return "👍";
        case ShardTrustLevel.TheSideEye: return "👀";
        case ShardTrustLevel.Warning: return "⚠️";
        case ShardTrustLevel.RedAlert: return "🚨";
    }
}

function ActionPrompt({ riskLevel }: { riskLevel: RecoveryRiskLevel }) {
    switch (riskLevel) {
        case RecoveryRiskLevel.Low:
            return <p className="text-green-600">No action needed.</p>;
        case RecoveryRiskLevel.Moderate:
            return <p className="text-yellow-600">Ask stale players to check in soon.</p>;
        case RecoveryRiskLevel.High:
            return <p className="text-orange-600">Replace or refresh stale shards to maintain recovery ability.</p>;
        case RecoveryRiskLevel.Critical:
            return <p className="text-red-600 font-bold">Recovery not possible! Add or replace players immediately.</p>;
    }
}
