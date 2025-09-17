import {DealerRecoveryRiskReport, ShardTrustLevel} from "../../provider/auth/SecurityHealthProvider";
import {SubtleMessage} from "@homebase-id/common-app";

export function DealerRecoveryRiskDetails({ report }: { report: DealerRecoveryRiskReport }) {
  return (
    <div>
      <ul className="list-disc pl-5">
        <li>
          <SubtleMessage>
            {report.isRecoverable
              ? "✅ You currently have enough shards to recover."
              : "❌ Not enough usable shards for recovery."}
          </SubtleMessage>
        </li>

        {(() => {
          const unreachableCount = report.players.filter(
            (p) => p.isMissing || p.trustLevel === ShardTrustLevel.Critical
          ).length;
          const margin = report.validShardCount - report.minRequired;

          if (unreachableCount > 0) {
            return (
              <li>
                <SubtleMessage>
                  {unreachableCount} player
                  {unreachableCount > 1 ? "s are" : " is"} unreachable.
                  {report.isRecoverable && unreachableCount > margin && (
                    <>
                      {" "}
                      ⚠️ Recovery is possible now, but fragile — one more loss
                      will block recovery.
                    </>
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
  );
}