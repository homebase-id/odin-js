import {DealerRecoveryRiskReport, RecoveryRiskLevel} from "../../provider/auth/SecurityHealthProvider";
import {Link} from "react-router-dom";
import {AlertOctagon, Skull} from "lucide-react";
import { Exclamation, Check } from '@homebase-id/common-app/icons';

export function DealerRecoveryRiskHeadline({
                                               report,
                                               hidePrompt
                                           }: {
    report: DealerRecoveryRiskReport;
    hidePrompt?: boolean
}) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <DealerRecoveryRiskHeadlineText report={report}/>
            {!hidePrompt && <ActionPrompt riskLevel={report.riskLevel}/>}
        </div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export function DealerRecoveryRiskHeadlineText({report}: {
    report: DealerRecoveryRiskReport;
}) {
    let text: string;
    let Icon: React.ComponentType<any>;
    let iconColor: string;

    switch (report.riskLevel) {
        case RecoveryRiskLevel.Low:
            text = "Recovery is safe";
            Icon = Check;
            iconColor = "text-success";
            break;

        case RecoveryRiskLevel.Moderate:
            text = "Recovery is fragile";
            Icon = Exclamation;
            iconColor = "text-warning";
            break;

        case RecoveryRiskLevel.High:
            text = "Just enough shards";
            Icon = AlertOctagon;
            iconColor = "text-destructive";
            break;

        case RecoveryRiskLevel.Critical:
            text = "Recovery not possible";
            Icon = Skull;
            iconColor = "text-destructive";
            break;

        default:
            text = "Recovery status unknown";
            Icon = AlertOctagon;
            iconColor = "text-muted-foreground";
            break;
    }

    return (
        <span className={`flex items-center gap-1 ${report.riskLevel === RecoveryRiskLevel.High || report.riskLevel === RecoveryRiskLevel.Critical ? "text-destructive" : ""}`}>
            <Icon className={`h-4 w-4 ${iconColor}`}/>
            {text}
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
                <Link to={url} className="text-primary underline">
                    Configure now
                </Link>
            );
        case RecoveryRiskLevel.High:
            return (
                <Link to={url} className="text-primary underline">
                    {/*Re-configure shards now*/}
                    Change
                </Link>
            );
        case RecoveryRiskLevel.Critical:
            return (
                <Link to={url} className="text-primary underline">
                    Reset now
                </Link>
            );
        case RecoveryRiskLevel.Low:
            return (
                <Link to={url} className="text-primary underline">
                    {/*Re-configure shards now*/}
                    Change
                </Link>
            );
        default:
            return null;
    }
}