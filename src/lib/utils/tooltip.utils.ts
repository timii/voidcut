import type { ITooltipCoords } from "$lib/interfaces/Tooltip";

export const getTooltipPosition = (
    containerRef: HTMLSpanElement | null,
    tooltipRef: HTMLDivElement | null,
    coords: ITooltipCoords
) => {
    if (!containerRef || !tooltipRef) {
        return coords;
    }

    // get the position of tooltip container in window 
    const containerRect = containerRef.getBoundingClientRect();

    coords.top = containerRect.top;
    coords.left = containerRect.left + containerRect.width / 2;

    return coords;
}
