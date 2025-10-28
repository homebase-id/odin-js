import {DealerRecoveryRiskReport, RecoveryRiskLevel} from "../../provider/auth/SecurityHealthProvider";
import {Link} from "react-router-dom";

export function DealerRecoveryRiskHeadline({
                                               report,
                                               hidePrompt
                                           }: {
    report: DealerRecoveryRiskReport;
    hidePrompt?: boolean
}) {
    return (
        <span className="ml-2 space-x-1">
            <DealerRecoveryRiskHeadlineText report={report}/>
            {/*<TimeAgoUtc value={report.healthLastChecked ?? 0}/>*/}
            {!hidePrompt &&
                <ActionPrompt riskLevel={report.riskLevel}/>
            }
        </span>
    );
}


export function DealerRecoveryRiskHeadlineText({report}: { report: DealerRecoveryRiskReport }) {
    let headline: string;

    let textColor;
    switch (report.riskLevel) {
        case RecoveryRiskLevel.Low:
            headline = "✅ Recovery key is safe";
            textColor = "text-green-600"
            break;
        case RecoveryRiskLevel.Moderate:
            // headline = "⚠️ Recovery is fragile. You should add at least one more trusted connection";
            headline = "⚠️ Recovery is fragile";
            textColor = "text-green-600"
            break;
        case RecoveryRiskLevel.High:
            // headline = "🚨 Just enough shards — at risk; add at least 2 more trusted connections";
            headline = "🚨 Just enough shards";
            textColor = "text-red-600"
            break;
        case RecoveryRiskLevel.Critical:
            headline = "💀 Recovery not possible";
            textColor = "text-red-600"
            break;
        default:
            headline = "ℹ️ Recovery status unknown";
            textColor = "text-red-600"
            break;
    }

    return <span className={textColor}>{headline}</span>
}


export function ActionPrompt({riskLevel}: {
    riskLevel: RecoveryRiskLevel;
}) {

    const url = '/owner/security/password-recovery?gs=1'
    switch (riskLevel) {
        case RecoveryRiskLevel.Moderate:
            return (
                <Link to={url} className="text-blue-600 underline">
                    Configure now
                </Link>
            );
        case RecoveryRiskLevel.High:
            return (
                <Link to={url} className="text-blue-600 underline">
                    {/*Re-configure shards now*/}
                    Add More connections
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