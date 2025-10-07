import {ActionButtonState, t, useDotYouClient} from "@homebase-id/common-app";
import {ActionButton} from "@homebase-id/common-app";
import {Person} from "@homebase-id/common-app/icons";
import {ShamirConfigurationType} from "../../../provider/auth/ShamirProvider";
import {enableAutoPasswordRecovery} from "../../../provider/system/SystemProvider";
import {useState} from "react"; // adjust import if needed

export const Step1SelectConfigurationType = ({
                                               onUpdateType,
                                             }: {
  onUpdateType: (type: ShamirConfigurationType) => void;

}) => {

  const [state, setState] = useState<ActionButtonState>()
  const [showAutoEnabledFinalized, setShowAutoEnabledFinalized] = useState<boolean>(false);
  const [showAutoRecoveryNotEnabled, setShowAutoRecoveryNotEnabled] = useState<boolean>(false);

  const client = useDotYouClient().getDotYouClient();

  const close = () => {
    onUpdateType("manual");
  }
  
  const handleAutoClick = async () => {

    try {
      setState("loading");
      await enableAutoPasswordRecovery(client);
      setShowAutoEnabledFinalized(true);
      setState("success");
    }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    catch (error) {
      setShowAutoRecoveryNotEnabled(true);
      setShowAutoEnabledFinalized(true);
      setState("error");
    }
  }

  if (showAutoEnabledFinalized) {
    return (
      <>
        {showAutoRecoveryNotEnabled ?
          (
            <div className="flex flex-col gap-8">
              <div
                className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-row items-center gap-3">
                  <Person className="h-6 w-6 text-primary"/>
                  <h3 className="text-lg font-semibold">
                    {t('Auto Recovery not supported by Hosting Provider')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  This hosting provider does not have auto-password recovery enabled. You can manually configure using
                  your trusted connections
                </p>
                <div className="mt-4">
                  <ActionButton onClick={() => close()}>
                    {t('Use Manual')}
                  </ActionButton>
                </div>
              </div>
            </div>) : (
            <div className="flex flex-col gap-8">
              <div
                className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-row items-center gap-3">
                  <Person className="h-6 w-6 text-primary"/>
                  <h3 className="text-lg font-semibold">
                    {t('Automatic Recovery Enabled')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t("Your password recovery will be handled automatically by the system. Your recovery details have be divided among multiple managed identities for safekeeping.")}
                </p>
                <div className="mt-4">
                  <ActionButton onClick={() => close()}>
                    {t('Close')}
                  </ActionButton>
                </div>
              </div>
            </div>
          )
        }
      </>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Automatic configuration */}
      <div
        className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-row items-center gap-3">
          <Person className="h-6 w-6 text-primary"/>
          <h3 className="text-lg font-semibold">
            {t("Automatic Recovery Configuration")}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {t(
            "Your password recovery will be handled automatically by the system. Your recovery details will be divided among multiple managed identities for safekeeping. This method is more convenient but less secure—it’s recommended to use trusted contacts instead."
          )}
        </p>
        <div className="mt-4">
          <ActionButton type="primary" state={state} onClick={() => handleAutoClick()}>
            {t("Use Automatic Recovery")}
          </ActionButton>
        </div>
      </div>

      {/* Manual configuration */}
      <div
        className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-row items-center gap-3">
          <Person className="h-6 w-6 text-primary"/>
          <h3 className="text-lg font-semibold">
            {t("Manual Recovery Configuration")}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {t(
            "You will choose from your trusted connections who will each keep a fragment of your recovery information."
          )}
        </p>
        <div className="mt-4">
          <ActionButton type="primary" onClick={() => onUpdateType("manual")}>
            {t("Use Manual Recovery")}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
  
