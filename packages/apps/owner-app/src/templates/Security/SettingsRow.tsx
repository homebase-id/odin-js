// SettingsRow.tsx
import { ReactNode } from "react";

export function SettingsRow({
                                label,
                                children,
                                className = "",
                            }: {
    label: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-1 gap-x-2 ${className}`}
        >
            <p className="font-medium whitespace-nowrap">{label}</p>
            {children}
        </div>
    );
}
