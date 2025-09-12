import {ApiType, getKnownOdinErrorMessages} from '@homebase-id/js-lib/core';
import {OwnerClient} from "@homebase-id/common-app";
import {encryptRecoveryKey, prepareAuthPassword} from "./AuthenticationHelper";
import {getNonce, getPublicKey, getSalts} from "./AuthenticationProvider";
import {ShamiraPlayer} from "./ShamirProvider";

export interface DealerRecoveryRiskReport {

    healthLastChecked: number;

    /** True if the dealer currently has enough usable shards */
    isRecoverable: boolean;

    /** Number of usable shards (isValid && !isMissing && trustLevel !== RedAlert) */
    validShardCount: number;

    /** Minimum number of shards required for recovery */
    minRequired: number;

    /** Overall system risk level */
    riskLevel: RecoveryRiskLevel;

    /** Detailed per-player shard health */
    players: PlayerShardHealthResult[];
}

export enum RecoveryRiskLevel {
    Low = "Low",         // Plenty of shards, mostly healthy and active
    Moderate = "Moderate", // Enough shards, but some are getting stale
    High = "High",       // Just enough shards, or some show worrisome trust levels
    Critical = "Critical" // Not enough usable shards to meet recovery threshold
}

export interface PlayerShardHealthResult {
    player: ShamiraPlayer;
    isValid: boolean;
    shardId: string;
    trustLevel: ShardTrustLevel;
    isMissing: boolean;
}

export enum ShardTrustLevel {
    Thumbsup = "thumbsup",   // Active recently
    TheSideEye = "theSideEye", // Slightly stale
    Warning = "warning",     // Worrisome
    RedAlert = "redAlert"    // Very stale or missing
}


export interface VerificationStatus {
    passwordLastVerified: number; // Unix timestamp (UTC)
    recoveryKeyLastVerified: number; // Unix timestamp (UTC)
}


const root = "/security/recovery"

export interface RecoveryInfo {
    email: string,
    status: VerificationStatus,
    recoveryRisk: DealerRecoveryRiskReport
}

export const getRecoveryInfo = async (): Promise<RecoveryInfo | null> => {

    const dotYouClient = new OwnerClient({
        api: ApiType.Owner,
    });

    const client = dotYouClient.createAxiosClient({overrideEncryption: false});

    const url = `${root}/recovery-info`;
    return await client
        .get<RecoveryInfo>(url)
        .then((response) => {
            return response.data;
        })
        .catch((error) => {
            console.warn(error);
            return null;
        });
};

export const verifyRecoveryKey = async (recoveryKey: string): Promise<boolean> => {
    const dotYouClient = new OwnerClient({
        api: ApiType.Owner,
    });

    const publicKey = await getPublicKey(dotYouClient);
    const salts = await getSalts(dotYouClient);
    const passwordReply = await prepareAuthPassword("some thing to toss away", salts);

    const encryptedRecoveryKey = await encryptRecoveryKey(recoveryKey, passwordReply, publicKey);

    const client = dotYouClient.createAxiosClient({overrideEncryption: true});
    const url = `${root}/verify-recovery-key`;

    return await client.post(url, {encryptedRecoveryKey})
        .then((response) => {
            return response.status === 200;
        })
        .catch((error) => {
            if (error.response?.status === 403) {
                return false;
            }
            console.error(error);
            return false;
        });
};

// Verifies the password without logging in the owner (i.e. changing cookies, etc.)
export const verifyPassword = async (password: string): Promise<boolean> => {
    const dotYouClient = new OwnerClient({
        api: ApiType.Owner,
    });

    const noncePackage = await getNonce(dotYouClient);
    const reply = await prepareAuthPassword(password, noncePackage);

    const client = dotYouClient.createAxiosClient({overrideEncryption: true});
    const url = `${root}/verify-password`;

    return await client.post(url, reply)
        .then((response) => {
            return response.status === 200;
        })
        .catch((error) => {
            if (error.response?.status === 403) {
                return false;
            }
            console.error(error);
            return false;
        });
};


export const updateRecoveryEmail = async (recoveryEmail: string, password: string) => {
    const dotYouClient = new OwnerClient({
        api: ApiType.Owner,
    });

    const noncePackage = await getNonce(dotYouClient);
    const reply = await prepareAuthPassword(password, noncePackage);

    const client = dotYouClient.createAxiosClient({overrideEncryption: true});
    const url = `${root}/update-recovery-email`;

    return await client.post(url, {
        email: recoveryEmail,
        passwordReply: reply
    })
        .then((response) => {
            // no-op
        })
        .catch((error) => {
            if (error.response?.status === 403) {
                throw new Error("Your password is invalid");
            }

            if (error.response?.status === 400) {
                const knownErrorText = getKnownOdinErrorMessages(error);

                if (knownErrorText) {
                    throw new Error(knownErrorText)
                }

                throw new Error("An unknown error occurred.");

            }
            console.error(error);
        });
};