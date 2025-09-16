import {
  DealerRecoveryRiskReport,
  RecoveryRiskLevel,
  ShardTrustLevel,
} from "../../provider/auth/SecurityHealthProvider";
import {SubtleMessage} from "@homebase-id/common-app";

export function DealerRecoveryRiskOverview({
                                             report,
                                             onConfigure,
                                           }: {
  report: DealerRecoveryRiskReport;
  onConfigure: () => void;
}) {
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

  return (
    <>
      <div>
        <span className="">{headline}</span>
      </div>
      <div>
        <ul className="list-disc pl-5">
          <li>
            <SubtleMessage>
              {report.validShardCount >= report.minRequired
                ? `${report.validShardCount} shards available (enough to recover)`
                : `${report.validShardCount} shards available, but ${report.minRequired} required`}
            </SubtleMessage>
          </li>

          <li>
            <SubtleMessage>
              {report.isRecoverable
                ? "✅ You currently have enough shards to recover."
                : "❌ Not enough usable shards for recovery."}
            </SubtleMessage>
          </li>

          {(() => {
            const unreachableCount = report.players.filter(
              (p) => p.isMissing || p.trustLevel === ShardTrustLevel.RedAlert
            ).length;
            const margin = report.validShardCount - report.minRequired;

            if (unreachableCount > 0) {
              return (
                <li>
                  <SubtleMessage>
                    {unreachableCount} player{unreachableCount > 1 ? "s are" : " is"} unreachable.
                    {report.isRecoverable && unreachableCount > margin && (
                      <> ⚠️ Recovery is possible now, but fragile — one more loss will block recovery.</>
                    )}
                  </SubtleMessage>
                </li>
              );
            }
          })()}

          {(() => {
            const invalidCount = report.players.filter((p) => !p.isValid).length;
            if (invalidCount > 0) {
              return (
                <li>
                  <SubtleMessage>
                    {invalidCount} shard{invalidCount > 1 ? "s are" : " is"} invalid.
                  </SubtleMessage>
                </li>
              );
            }
          })()}
        </ul>
      </div>
      <ActionPrompt riskLevel={report.riskLevel} onConfigure={onConfigure}/>
    </>
  );


}

function trustEmoji(level: ShardTrustLevel): string {
  switch (level) {
    case ShardTrustLevel.Thumbsup:
      return "👍";
    case ShardTrustLevel.TheSideEye:
      return "👀";
    case ShardTrustLevel.Warning:
      return "⚠️";
    case ShardTrustLevel.RedAlert:
      return "🚨";
  }
}

function ActionPrompt({
                        riskLevel,
                        onConfigure,
                      }: {
  riskLevel: RecoveryRiskLevel;
  onConfigure: () => void;
}) {
  switch (riskLevel) {
    case RecoveryRiskLevel.Low:
      return <span className="text-green-600">No action needed.</span>;
    case RecoveryRiskLevel.Moderate:
      return (
        <span className="text-yellow-600">
          Some shards are stale.{" "}
          <button className="text-blue-600 underline" onClick={onConfigure}>
            Configure shards
          </button>
          {" "}
          to stay protected.
        </span>
      );
    case RecoveryRiskLevel.High:
      return (
        <span className="text-orange-600">
          Recovery is at risk.{" "}
          <button className="text-blue-600 underline" onClick={onConfigure}>
            Re-configure shards now
          </button>
          .
        </span>
      );
    case RecoveryRiskLevel.Critical:
      return (
        <span className="text-red-600 font-bold">
          Recovery not possible!{" "}
          <button className="text-blue-600 underline" onClick={onConfigure}>
            Add or replace shards immediately
          </button>
          .
        </span>
      );
  }
}
