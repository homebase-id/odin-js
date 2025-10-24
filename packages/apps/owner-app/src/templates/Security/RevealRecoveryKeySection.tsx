import {useEffect, useState} from "react";
import {Clipboard, CloseEye, Eye} from "@homebase-id/common-app/icons";
import {
    ActionButton, ActionButtonState,
    Alert,
    formatDateExludingYearIfCurrent,
    t,
    useDotYouClientContext,
} from "@homebase-id/common-app";
import {
    getRecoveryKey,
    requestRecoveryKey,
    RecoveryKeyResult,
    RequestRecoveryKeyResult,
} from "../../provider/auth/RecoveryProvider";
import Section from "../../components/ui/Sections/Section";
import {VerifyRecoveryKeyDialog} from "./Dialog/VerifyRecoveryKeyDialog";

type Status = "loading" | "prompt-view-initial-key" | "prompt" | "waiting" | "success" | "failure";

export function RevealRecoveryKeySection() {

    const [openDialog, setOpenDialog] = useState<'none' | 'verify-password' | 'verify-recovery-phrase' | 'change-email' | 'verify-email'>('none');

    const dotYouClient = useDotYouClientContext();

    const [recoveryKey, setRecoveryKey] = useState<RecoveryKeyResult | null>(null);
    const [recoveryKeyRequest, setRecoveryKeyRequest] = useState<RequestRecoveryKeyResult | null>(null);
    const [status, setStatus] = useState<Status>("loading");

    useEffect(() => {
        const loadRecoveryKey = async () => {
            setStatus("loading");
            const result = await getRecoveryKey(dotYouClient);
            // console.log('aa33',result)

            if (!result) {
                setStatus("prompt");
                return;
            }

            if (!result.hasInitiallyReviewedKey) {
                setStatus("prompt-view-initial-key")
                return;
            }

            if (result.key) {
                setRecoveryKey(result);
                setStatus("success");
                return;
            }

            if (result.nextViewableDate) {
                setRecoveryKey(result);
                setStatus("waiting");
                return;
            }

            setStatus("prompt");
        };

        loadRecoveryKey().then(r => {
        });
    }, [dotYouClient]);

    const handleConfirmDialog = async () => {
        setOpenDialog('none');
    }

    const handleRequest = async () => {
        setStatus("loading");
        const result = await requestRecoveryKey(dotYouClient);
        if (result) {
            setRecoveryKeyRequest(result);
            setStatus("waiting");
        } else {
            setStatus("failure");
        }
    };

    const handleTryNow = async () => {
        setStatus("loading");
        const key = await getRecoveryKey(dotYouClient);
        if (key && key.key) {
            setRecoveryKey(key);
            setStatus("success");
        } else if (key && key.nextViewableDate) {
            setRecoveryKey(key);
            setStatus("waiting");
        } else {
            setStatus("failure");
        }
    };

    let content;
    if (status === "loading") {
        content = <div>{t("Loading...")}</div>;

    } else if (status === "waiting") {
        const rawNextDate = recoveryKey?.nextViewableDate ?? recoveryKeyRequest?.nextViewableDate ?? 0;
        const adjustedDate = rawNextDate ? rawNextDate + 60_000 : 0;
        const formattedDate = formatDateExludingYearIfCurrent(new Date(adjustedDate));

        content = (
            <div className="flex flex-col items-start gap-4">
                <div>
                    {t(
                        `Recovery key requested. Please return here on ${formattedDate} or after to view your key.`
                    )}
                </div>
                <ActionButton type="primary" onClick={handleTryNow} icon={Eye}>
                    {t("Try now")}
                </ActionButton>
            </div>
        );
    } else if (status === "success" && recoveryKey?.key) {
        content = (
            <div className="space-y-4">
                <div className="rounded-md bg-yellow-50 p-4 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200">
                    <p className="font-semibold mb-2">{t("Important Security Notice")}</p>
                    <p className="text-sm leading-relaxed">
                        {t(
                            "This is your recovery key. Do not share it with anyone. Store it securely in a password manager or offline location."
                        )}
                    </p>
                    <p className="mt-3 text-sm italic">
                        {t(
                            "Once you leave this screen, you will need to re-request access and wait another two weeks to view it again."
                        )}
                    </p>
                </div>

                <ClickToReveal textToShow={recoveryKey.key}/>
            </div>
        );
    } else if (status === "prompt-view-initial-key") {
        return <GenerateNewRecoveryKeySection/>
    } else {
        content = (
            <>
                {status === "failure" && (
                    <Alert type="critical" className="mb-5">
                        {t("Cannot reveal key; try again later")}
                    </Alert>
                )}

                <ActionButton type="primary" icon={Eye} onClick={handleRequest}>
                    {t("Request recovery key")}
                </ActionButton>

                {status === "prompt" && (
                    <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                        {t("Click the button above to request access to your recovery key.")}
                    </div>
                )}
            </>
        );
    }

    return (
        <Section title={
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                    <span className="block text-lg">{t('Recovery Phrase')}</span>
                    <div className="mt-1 text-sm text-gray-400">
                        {/*{t(*/}
                        {/*  'Your recovery phrase lets you reset your password if you ever forget it.  Request your key by clicking the button below.  There is a 2-week waiting period to get your key'*/}
                        {/*)}*/}
                        You can verify your recovery phrase {' '}
                        <button onClick={() => setOpenDialog('verify-recovery-phrase')} className="text-blue-600 underline">
                            here
                        </button>
                        .{' '}If you forgot your recovery phrase you can request it again by clicking the button below. There is a 2-week waiting period to
                        get your phrase.
                    </div>
                </div>
            </div>
        }>
            {content}
            <VerifyRecoveryKeyDialog title={t('Verify Recovery Phrase')}
                                     isOpen={openDialog === 'verify-recovery-phrase'}
                                     onConfirm={handleConfirmDialog}
                                     onCancel={() => setOpenDialog('none')}
                                     showHint={false}/>
        </Section>
    )
}


const GenerateNewRecoveryKeySection = () => {
    type Status2 = "loading" | "prompt" | "waiting" | "success" | "failure";

    const dotYouClient = useDotYouClientContext();
    const [recoveryKeyRequest, setRecoveryKeyRequest] = useState<RequestRecoveryKeyResult | null>(null);
    const [status, setStatus] = useState<Status2>("prompt");

    const handleGenerateNew = async () => {
        setStatus("waiting");
        const result = await requestRecoveryKey(dotYouClient);
        if (result?.key !== "") {
            setRecoveryKeyRequest(result);
            setStatus("success");
        } else {
            setStatus("failure");
        }
    }
    const state: ActionButtonState =
        status === "waiting" ? "pending" :
            status === "failure" ? "error" : "idle";
    return (
        <Section title={
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                    <span className="block text-lg">{t('Recovery Phrase')}</span>
                    <div className="mt-1 text-sm text-gray-400">
                        To get your recovery phrase press the button below. You should store this safely.
                    </div>
                </div>
            </div>
        }>
            {status === "success" && <ClickToReveal textToShow={recoveryKeyRequest!.key ?? ""}/>}
            
            {(status === "prompt" || status === "waiting") &&
                <>
                    <ActionButton type="primary" state={state} icon={Eye} onClick={handleGenerateNew}>
                        {t("Generate New Recovery Phrase")}
                    </ActionButton>

                    {/*<div className="mt-4 text-sm text-gray-600 dark:text-gray-400">*/}
                    {/*    {t("")}*/}
                    {/*</div>*/}
                </>}

            {status === "failure" && <Alert type="critical">Failed to load your recovery key. Please try again</Alert>}

        </Section>
    )
}


const ClickToReveal = ({
                           textToShow
                       }: {
    textToShow?: string
}) => {
    const [show, setShow] = useState(false);
    const [showCopied, setShowCopied] = useState(false);
    const redactedText = textToShow?.replace(/[^ ]/g, "•");

    useEffect(() => {
        if (show) {
            const timeout = setTimeout(() => setShow(false), 30_000); // Auto-hide after 30s
            return () => clearTimeout(timeout);
        }
    }, [show]);

    const doCopy = () => {
        if (textToShow) {
            navigator.clipboard.writeText(textToShow);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 1500);
        }
    };

    const buttonStyle =
        "flex h-12 w-full cursor-pointer items-center justify-center dark:border-gray-700 md:w-12 text-foreground hover:text-primary dark:hover:text-primary-dark";

    return (
        <div className="relative flex flex-col items-center rounded border border-gray-300 dark:border-gray-700 md:flex-row">
            <div className="flex w-full flex-row justify-around border-b dark:border-gray-700 md:contents">
                <button className={`${buttonStyle} md:border-r`} onClick={() => setShow(!show)}>
                    {show ? <CloseEye className="h-6 w-6"/> : <Eye className="h-6 w-6"/>}
                </button>
                <button className={`${buttonStyle} opacity-50 md:order-3 md:border-l`} onClick={doCopy}>
                    <Clipboard className="h-6 w-6"/>
                </button>
            </div>

            <div
                className={`w-full bg-white px-3 py-2 text-center text-[1.6rem] leading-8 tracking-wider text-gray-700 dark:bg-gray-800 dark:text-gray-100 md:text-left ${
                    show ? "" : "pointer-events-none select-none break-words"
                }`}>
                {show ? textToShow : redactedText}
            </div>

            {showCopied && (
                <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-lg bg-slate-800 px-2 py-1 text-sm text-white dark:bg-slate-600">
            {t("Copied to clipboard")}
          </span>
                </div>
            )}
        </div>
    );
};
