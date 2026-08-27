import {
  t,
  ActionButton,
  Alert,
  Input,
  Label,
  useDotYouClient,
  ActionButtonState,
} from "@homebase-id/common-app";
import {useEffect, useState} from "react";
import Section from "../../components/ui/Sections/Section";
import {
  forceVersionNumber,
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

  const [forceVersionState, setForceVersionState] = useState<ActionButtonState>("idle");
  const [targetVersion, setTargetVersion] = useState<string>("");
  const [forceVersionError, setForceVersionError] = useState<string | null>(null);
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

  const setVersionNumber = async () => {
    const version = parseInt(targetVersion, 10);
    if (isNaN(version)) {
      setForceVersionError(t("Enter a valid version number"));
      return;
    }

    setForceVersionError(null);
    try {
      setForceVersionState("loading");
      await forceVersionNumber(getDotYouClient(), version);
      await reset();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setForceVersionError(err?.message ?? t("Failed to set the version number"));
    } finally {
      setForceVersionState("idle");
    }
  };

  const reset = async () => {
    setLoading(true);
    setError(null);
    try {
      const version = await getDataVersionInfo(getDotYouClient());
      setVersionInfo(version);
      setTargetVersion(`${version.actualDataVersionNumber}`);
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
    <>
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

      {!loading && versionInfo && (
        <Section title={t("Set Data Version")}>
          <Alert type="warning" className="mb-5">
            {t(
              "Setting your data version to a lower number makes the server run the upgrade steps from that version again. Only do this if you know why you need it."
            )}
          </Alert>

          {forceVersionError && <p className="mb-5 text-red-600">{forceVersionError}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.reportValidity()) setVersionNumber();
            }}
          >
            <div className="mb-2">
              <Label htmlFor="targetVersion">{t("Data Version Number")}</Label>
              <Input
                required
                id="targetVersion"
                name="targetVersion"
                type="number"
                step={1}
                min={0}
                max={versionInfo.serverDataVersionNumber}
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
              />
              <p className="mt-2 max-w-lg text-slate-400">
                {t("The server is on data version")}{" "}
                {versionInfo.serverDataVersionNumber}
              </p>
            </div>

            <div className="mt-5 flex flex-row-reverse">
              <ActionButton
                confirmOptions={{
                  title: t("Set Data Version"),
                  body: t(
                    "Are you sure you want to change your data version number? The upgrade steps after this version will run again."
                  ),
                  buttonText: t("Yes, continue"),
                }}
                state={forceVersionState}
                onClick={() => setVersionNumber()}
              >
                {t("Set version number")}
              </ActionButton>
            </div>
          </form>
        </Section>
      )}
    </>
  );
};
