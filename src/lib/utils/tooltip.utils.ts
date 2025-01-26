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
    const tooltipRect = tooltipRef.getBoundingClientRect();

    coords.top = containerRect.top;
    coords.left = containerRect.left + containerRect.width / 2;

    // calculate if element goes outside of window, we need to add half the tooltip width since coords.left is at the middle of the tooltip right now
    const widthOutsideWindow = coords.left + (tooltipRect.width / 2) - window.innerWidth

    // if the element clips out of the window, adjust the left offset
    if (widthOutsideWindow > 0) {
        // calculate how much the toolbox needs to be adjusted by, to not be cut off at the screen edge
        coords.left = coords.left - widthOutsideWindow
    }
    console.log("window width:", window.innerWidth, "coords.left:", coords.left, "tooltipRect.width:", tooltipRect.width, "widthOutsideWindow:", widthOutsideWindow, "containerRect.width:", containerRect.width);

    return coords;
}
