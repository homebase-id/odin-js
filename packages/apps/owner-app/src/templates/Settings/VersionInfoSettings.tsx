import {
  t,
  ActionButton,
  Label,
  useDotYouClient,
  ActionButtonState,
} from "@homebase-id/common-app";
import {useEffect, useState} from "react";
import Section from "../../components/ui/Sections/Section";
import {
  forceVersionUpgrade,
  getDataVersionInfo,
  VersionInfoResult,
} from "../../provider/system/DataConversionProvider";
import {TimeAgoUtc} from "../../components/ui/Date/TimeAgoUtc";
import {CheckCircle} from "lucide-react"; // green check icon

export const VersionInfoSettings = () => {
  const [state, setState] = useState<ActionButtonState>("idle");
  const [versionInfo, setVersionInfo] = useState<VersionInfoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {getDotYouClient} = useDotYouClient();

  const forceUpgrade = async () => {
    try {
      setState("loading");
      await forceVersionUpgrade(getDotYouClient());
      await reset();
    } finally {
      setState("idle");
    }
  };

  const reset = async () => {
    setLoading(true);
    setError(null);
    try {
      const version = await getDataVersionInfo(getDotYouClient());
      setVersionInfo(version);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message ?? "Failed to load version info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reset();
  }, []);

  return (
    <Section title={t("Data Version Info")}>
      <p className="mb-5 max-w-lg text-slate-400">
        {t("This is information about your current data version.")}
      </p>

      {loading && <p className="text-slate-400">{t("Loading...")}</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && versionInfo && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.currentTarget.reportValidity()) forceUpgrade();
          }}
        >
          <div className="mb-2">
            <Label>{t("Server Data Version")}</Label>
            <p className="mb-5 max-w-lg text-slate-400">
              {versionInfo.serverDataVersionNumber}
            </p>
          </div>

          <div className="mb-2">
            <Label>{t("Your Data Version")}</Label>
            <p className="mb-5 max-w-lg text-slate-400 flex items-center">
              {versionInfo.actualDataVersionNumber}
              {versionInfo.actualDataVersionNumber ===
                versionInfo.serverDataVersionNumber && (
                  <CheckCircle
                    className="ml-2 h-5 w-5 text-green-500"
                    aria-label={t("Versions match")}
                  />
                )}
            </p>
          </div>

          <div className="mb-2">
            <Label>{t("Last Upgraded")}</Label>
            <p className="mb-5 max-w-lg text-slate-400">
              <TimeAgoUtc
                value={versionInfo.lastUpgraded}
                showAbsolute={true}
                absoluteFormat="datetime"
              />
            </p>
          </div>

          {versionInfo.failedDataVersionNumber != null && (
            <div className="mb-2">
              <Label>{t("Failed Data Version")}</Label>
              <p className="mb-5 max-w-lg text-slate-400">
                {versionInfo.failedDataVersionNumber}
              </p>
            </div>
          )}

          {versionInfo.lastAttempted != null && (
            <div className="mb-2">
              <Label>{t("Last Attempted")}</Label>
              <p className="mb-5 max-w-lg text-slate-400">
                <TimeAgoUtc
                  value={versionInfo.lastAttempted}
                  showAbsolute={true}
                  absoluteFormat="datetime"
                />
              </p>
            </div>
          )}

          {versionInfo.failedBuildVersion && (
            <div className="mb-2">
              <Label>{t("Failed Build Version")}</Label>
              <p className="mb-5 max-w-lg text-slate-400">
                {versionInfo.failedBuildVersion}
              </p>
            </div>
          )}

          {versionInfo.failureCorrelationId && (
            <div className="mb-2">
              <Label>{t("Correlation Id")}</Label>
              <p className="mb-5 max-w-lg text-slate-400">
                {versionInfo.failureCorrelationId}
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-row-reverse">
            <ActionButton
              confirmOptions={{
                title: t("Force Upgrade"),
                body: t(
                  "Are you sure you want to start the upgrade process?"
                ),
                buttonText: t("Yes, continue"),
              }}
              state={state}
              onClick={() => forceUpgrade()}
            >
              {t("Force upgrade now")}
            </ActionButton>
          </div>
        </form>
      )}
    </Section>
  );
};
