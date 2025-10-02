import {useEffect, useState} from "react";
import {Clipboard, CloseEye, Eye} from "@homebase-id/common-app/icons";
import {ActionButton, Alert, formatDateExludingYearIfCurrent, t, useDotYouClientContext} from "@homebase-id/common-app";
import {
    getRecoveryKey,
    RecoveryKeyResponse,
    requestRecoveryKey,
    RequestRecoveryKeyResult
} from "../../provider/auth/RecoveryProvider";

export function RevealRecoveryKey() {

    const dotYouClient = useDotYouClientContext();
    const [recoveryKey, setRecoveryKey] = useState<RecoveryKeyResponse | null>();
    const [recoveryKeyResult, setRecoveryKeyResult] = useState<RequestRecoveryKeyResult | null>();
    const [status, setStatus] = useState<"prompt" | "failure" | "success" | "requested">("prompt");


    useEffect(() => {

    }, []);
    const handleRequest = async () => {
        const result = await requestRecoveryKey(dotYouClient);
        if (result) {
            setRecoveryKeyResult(result);
            setStatus("requested");
        }
    }

    const handleReveal = async () => {
        const key = await getRecoveryKey(dotYouClient);
        if (key) {
            setRecoveryKey(key);
            setStatus("success")
        } else {
            setStatus("failure");
            return;
        }
    }

    if (status === "requested") {
        const date = formatDateExludingYearIfCurrent(new Date(recoveryKeyResult?.nextViewableDate ?? 0));
        return <div>
            {t(`Recovery key requested.  Please return here on ${date} or after to view your key`)}
        </div>
    }

    if (status === "success") {
        return (<div>
            <ClickToReveal textToShow={recoveryKey?.key ?? ""}/>
        </div>)
    }

    return (
        <>
            {status === "failure" && <Alert type="critical" className="mb-5">Cannot reveal key; try again later</Alert>}
            <ActionButton type="primary" icon={Eye} onClick={handleRequest}>
                {t('Request recovery key')}
            </ActionButton>
        </>
    )
}


const ClickToReveal = ({textToShow}: { textToShow?: string }) => {
    const [show, setShow] = useState(false);
    const [showCopied, setShowCopied] = useState(false);
    const redactedText = textToShow?.replace(/[^ ]/g, '•');

    useEffect(() => {
        const timeout = setTimeout(() => setShow(false), 1000 * 30);
        return () => clearTimeout(timeout);
    }, [show]);

    const doCopy = () => {
        textToShow && navigator.clipboard.writeText(textToShow);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 1500);
    };

    const buttonStyle =
        'flex h-12 w-full cursor-pointer items-center justify-center dark:border-gray-700 md:w-12 text-foreground hover:text-primary dark:hover:text-primary-dark';

    return (
        <>
            <div
                className="relative flex flex-col items-center rounded border border-gray-300 dark:border-gray-700 md:flex-row">
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
                        show ? '' : 'pointer-events-none select-none break-words'
                    }`}
                >
                    {show ? textToShow : redactedText}
                </div>

                {showCopied && (
                    <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-sm text-white dark:bg-slate-600">
              {t('Copied to clipboard')}
            </span>
                    </div>
                )}
            </div>
        </>
    );
};
