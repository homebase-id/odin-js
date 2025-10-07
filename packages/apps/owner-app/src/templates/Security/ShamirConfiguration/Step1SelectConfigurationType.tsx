import { t } from "@homebase-id/common-app";
import { ActionButton } from "@homebase-id/common-app";
import {Person} from "@homebase-id/common-app/icons";
import {ShamirConfigurationType} from "../../../provider/auth/ShamirProvider"; // adjust import if needed

export const Step1SelectConfigurationType = ({
                                               onUpdateType,
                                             }: {
  onUpdateType: (type: ShamirConfigurationType) => void;
}) => {
  return (
    <div className="flex flex-col gap-8">
      {/* Automatic configuration */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-row items-center gap-3">
          <Person className="h-6 w-6 text-primary" />
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
          <ActionButton type="primary" onClick={() => onUpdateType("auto")}>
            {t("Use Automatic Recovery")}
          </ActionButton>
        </div>
      </div>

      {/* Manual configuration */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-row items-center gap-3">
          <Person className="h-6 w-6 text-primary" />
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
};
