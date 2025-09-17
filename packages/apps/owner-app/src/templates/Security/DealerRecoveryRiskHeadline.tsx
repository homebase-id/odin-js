import {DealerRecoveryRiskReport, RecoveryRiskLevel} from "../../provider/auth/SecurityHealthProvider";
import {Link} from "react-router-dom";

export function DealerRecoveryRiskHeadline({
                                             report,
                                           }: {
  report: DealerRecoveryRiskReport;
}) {
  let headline: string;

  switch (report.riskLevel) {
    case RecoveryRiskLevel.Low:
      headline = "✅ Recovery key is safe";
      break;
    case RecoveryRiskLevel.Moderate:
      headline = "⚠️ Recovery is fragile";
      break;
    case RecoveryRiskLevel.High:
      headline = "🚨 Just enough shards — at risk";
      break;
    case RecoveryRiskLevel.Critical:
      headline = "💀 Recovery not possible";
      break;
    default:
      headline = "ℹ️ Recovery status unknown";
      break;
  }

  return (
    <div className="flex flex-row gap-2">
      <span>{headline}</span>
      <ActionPrompt riskLevel={report.riskLevel}/>
    </div>
  );
}


function ActionPrompt({riskLevel}: {
  riskLevel: RecoveryRiskLevel;
}) {

  const url = '/owner/security/password-recovery'
  switch (riskLevel) {
    case RecoveryRiskLevel.Moderate:
      return (
        <Link to={url} className="text-blue-600 underline">
          Configure shards
        </Link>
      );
    case RecoveryRiskLevel.High:
      return (
        <Link to={url} className="text-blue-600 underline">
          Re-configure shards now
        </Link>
      );
    case RecoveryRiskLevel.Critical:
      return (
        <Link to={url} className="text-blue-600 underline">
          Reset now
        </Link>
      );

    default:
      return null;
  }
}