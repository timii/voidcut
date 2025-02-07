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

    // calculate if element goes outside right side of window, we need to add half the tooltip width since coords.left is at the middle of the tooltip right now
    const widthOutsideRightEdge = coords.left + (tooltipRect.width / 2) - window.innerWidth

    // calculate if element goes outside left side of screen 
    const widthOutsideLeftEdge = coords.left - (tooltipRect.width / 2)

    // if the element clips out of the right side of the window
    if (widthOutsideRightEdge > 0) {
        // subtract the tooltip width thats cut off from the orginal left offset
        coords.left = coords.left - widthOutsideRightEdge

        // update the width cutoff property to use it to offset the arrow position
        coords.widthCutoff = widthOutsideRightEdge
    }
    // if the element clips out of the left side of the window
    else if (widthOutsideLeftEdge < 0) {
        // add the tooltip width thats cut off tot the original left offset
        coords.left = coords.left + Math.abs(widthOutsideLeftEdge)

        // update the width cutoff property to use it to offset the arrow position
        coords.widthCutoff = (widthOutsideLeftEdge)
    }

    return coords;
}
