"use client";

import { useTransition } from "react";
import { disableDraftMode } from "@/actions/disable-draft-mode";
import { useIsPresentationTool } from "next-sanity/hooks";

export function DisableDraftMode() {
    const [pending, startTransition] = useTransition();
    const isPresentationTool = useIsPresentationTool();

    // Only show the disable draft mode button when outside of Presentation Tool
    if (isPresentationTool === null && isPresentationTool !== true) {
        return null;
    }

    const disable = () =>
        startTransition(() => disableDraftMode());

    return (
        <div>
            {pending ? (
                "Disabling draft mode..."
            ) : (
                <button type="button" onClick={disable}>
                    Disable draft mode
                </button>
            )}
        </div>
    );
}