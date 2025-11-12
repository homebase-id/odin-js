import {DealerRecoveryRiskReport, RecoveryRiskLevel} from "../../provider/auth/SecurityHealthProvider";
import {Link} from "react-router-dom";
import {Check} from "@homebase-id/common-app/icons";
import { AlertTriangle, AlertCircle, Skull } from "lucide-react";

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


export function DealerRecoveryRiskHeadlineText({ report }: { report: DealerRecoveryRiskReport }) {
    let headline: string;
    let textColor: string;
    let Icon: React.ElementType;

    switch (report.riskLevel) {
        case RecoveryRiskLevel.Low:
            headline = "Recovery key is safe";
            textColor = "text-green-600";
            Icon = Check;
            break;
        case RecoveryRiskLevel.Moderate:
            headline = "Recovery is fragile";
            textColor = "text-yellow-600";
            Icon = AlertTriangle;
            break;
        case RecoveryRiskLevel.High:
            headline = "Just enough shards";
            textColor = "text-orange-600";
            Icon = AlertCircle;
            break;
        case RecoveryRiskLevel.Critical:
            headline = "Recovery not possible";
            textColor = "text-red-600";
            Icon = Skull;
            break;
        default:
            headline = "Recovery status unknown";
            textColor = "text-gray-600";
            Icon = AlertCircle;
            break;
    }

    return (
        <span className={`inline-flex ${textColor}`}>
            <Icon className="h-4 w-4 mr-2" aria-hidden="true" />
            {headline}
        </span>
    );
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
                    Change
                </Link>
            );
        case RecoveryRiskLevel.Critical:
            return (
                <Link to={url} className="text-blue-600 underline">
                    Reset now
                </Link>
            );
        case RecoveryRiskLevel.Low:
            return (
                <Link to={url} className="text-blue-600 underline">
                    {/*Re-configure shards now*/}
                    Change
                </Link>
            );
        default:
            return null;
    }
}