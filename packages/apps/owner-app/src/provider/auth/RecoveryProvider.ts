import {DotYouClient} from '@homebase-id/js-lib/core';
import {openRevealedPhrase} from './ZeroKnowledgeProvider';

export interface RecoveryKeyResult {
    key: string | null;
    /** Once the browser took the phrase over: the phrase locked by the zero-knowledge master key. */
    zkMasterKeyEncryptedPhraseKey: string | null;
    created: number;
    nextViewableDate: number;
    hasInitiallyReviewedKey: boolean
}

export interface RequestRecoveryKeyResult {
    key: string | null;
    zkMasterKeyEncryptedPhraseKey: string | null;
    nextViewableDate: number;
}

/** After the takeover the server returns only the locked copy; the words are opened here. */
const withPhraseOpened = async <T extends { key: string | null; zkMasterKeyEncryptedPhraseKey: string | null }>(
    dotYouClient: DotYouClient,
    result: T
): Promise<T> =>
    !result.key && result.zkMasterKeyEncryptedPhraseKey
        ? {...result, key: await openRevealedPhrase(dotYouClient, result.zkMasterKeyEncryptedPhraseKey)}
        : result;

export const requestRecoveryKey = async (dotYouClient: DotYouClient) => {
    const axiosClient = dotYouClient.createAxiosClient();
    return await axiosClient
        .post<RequestRecoveryKeyResult>(`/security/request-recovery-key`)
        .then((response) => withPhraseOpened(dotYouClient, response.data))
        .catch((error) => {
            console.warn(error);
            return null;
        });
}

export const getRecoveryKey = async (dotYouClient: DotYouClient) => {
    const axiosClient = dotYouClient.createAxiosClient();

    return await axiosClient
        .get<RecoveryKeyResult>(`/security/recovery-key`)
        .then((response) => withPhraseOpened(dotYouClient, response.data))
        .catch((error) => {
            console.warn(error);
            return null;
        });
};

export const confirmUserStoredKey = async (dotYouClient: DotYouClient) => {
    const axiosClient = dotYouClient.createAxiosClient();

    return await axiosClient
        .post(`/security/confirm-stored-recovery-key`)
        .then((response) => {
            return response.status == 200;
        })
        .catch((error) => {
            console.warn(error);
            return false;
        });
};

