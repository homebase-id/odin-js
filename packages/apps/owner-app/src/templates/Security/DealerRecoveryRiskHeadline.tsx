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
    let textColor: string;

    switch (report.riskLevel) {
        case RecoveryRiskLevel.Low:
            text = "Recovery is safe";
            Icon = Check;
            textColor = "text-green-600";
            break;

        case RecoveryRiskLevel.Moderate:
            text = "Recovery is fragile";
            Icon = Exclamation;
            textColor = "text-yellow-600";
            break;

        case RecoveryRiskLevel.High:
            text = "Just enough shards";
            Icon = AlertOctagon;
            textColor = "text-red-600";
            break;

        case RecoveryRiskLevel.Critical:
            text = "Recovery not possible";
            Icon = Skull;
            textColor = "text-red-600";
            break;

        default:
            text = "Recovery status unknown";
            Icon = AlertOctagon;
            textColor = "text-gray-600";
            break;
    }

    return (
        <span className={`flex items-center gap-1 ${textColor}`}>
            <Icon className="h-4 w-4"/>
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