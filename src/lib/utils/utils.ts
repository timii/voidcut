import { MediaType, type IMedia } from "$lib/interfaces/Media";
import {
    type ITimelineElement,
} from "$lib/interfaces/Timeline";
import {
    isTimelineElementBeingDragged,
    isThumbBeingDragged,
    currentTimelineScale,
    draggedElement,
    isTimelineElementBeingResized,
    draggedOverFirstDivider,
    draggedUnderLastDivider,
    previewAspectRatio,
} from "../../stores/store";
import { CONSTS } from "./consts";
import { get } from "svelte/store";
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../../../tailwind.config.js'

// #region general utils
// convert a given pixel value into a milliseconds value using the current timeline scale
export function convertPxToMs(value: number) {
    return Math.round((value / get(currentTimelineScale)) * CONSTS.secondsMultiplier) || 0
}

// convert a given milliseconds value into a pixel value using the current timeline scale
export function convertMsToPx(value: number) {
    return Math.round((value / CONSTS.secondsMultiplier) * get(currentTimelineScale))
}


// generate a unique id
export function generateId() {
    return crypto.randomUUID() as string
}

// set all "beingDragged" values in store to false 
export function resetAllBeingDragged() {
    isThumbBeingDragged.set(false)
    isTimelineElementBeingDragged.set(false)
    isTimelineElementBeingResized.set(false)
    draggedElement.set(null)
}

// reset all over/under dividers helper store values
export function resetOverUnderDividers() {
    if (get(draggedOverFirstDivider)) {
        draggedOverFirstDivider.set(false)
    }

    if (get(draggedUnderLastDivider)) {
        draggedUnderLastDivider.set(false)
    }
}

// get all tailwind variables to use in components
export function getTailwindVariables() {
    return resolveConfig(tailwindConfig)
}

// get relative mouse coordinates to the given element DOMRect
export function getRelativeMousePosition(e: MouseEvent, el: DOMRect) {
    return {
        x: e.clientX - el.left,
        y: e.clientY - el.top
    };
}

// check if only the primary button is clicked for a given MouseEvent
export function onlyPrimaryButtonClicked(e: MouseEvent) { return e.buttons === 1 }

// check if a given element is of type image
export function elementIsAnImage(el: ITimelineElement | IMedia) {
    return el.type === MediaType.Image
}

// check if dragged element is a media pool element
export function isDraggedElementFromMediaPool(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) {
        return false
    }

    // if the dataTransfer object contains an item with the media pool transfer key we know the dragged element is a media pool element
    return dataTransfer.getData(CONSTS.mediaPoolTransferKey) === '' ? false : true
}

// check if dragged element is a media pool element
export function isDraggedElementAFile(list: DataTransferItemList | undefined): boolean {
    if (!list || list.length === 0) {
        return false
    }

    // if the data transfer items list contains an item with the kind "file" we know the dragged element is a file
    let containsFile = false
    for (const item of list) {
        if (item.kind === 'file') {
            containsFile = true;
            break;
        }
    }

    return containsFile
}

// checks if a given bounding rect has only 0s as values
export function allBoundingRectValuesZero(element: Element): boolean {
    const boundingRect = element.getBoundingClientRect()
    const values = Object.values(boundingRect)
    return values.every(value => !value || value === 0)
}

// check if a given width and height have the same ratio as the aspect ratio defined in the store
export function isSameAspectRatio(width: number, height: number): boolean {
    // get aspect ratio from store as a string
    const aspectRatioString = get(previewAspectRatio)
    // convert string to array of 2 numbers for the aspect ratio (first element: width, second: height)
    const aspectRatios = aspectRatioString.split('/')
    // calculate the ratio between both values
    const storeRatio = +(+aspectRatios[0] / +aspectRatios[1]).toFixed(2)

    // calculate ratio between given width and height (only include first two digits after dot)
    const givenRatio = +(width / height).toFixed(2)

    return storeRatio === givenRatio
}

// delays further async running by given ms amount (mainly used for testing) 
export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// check if current build is production build
export function isProduction(): boolean {
    return import.meta.env.PROD
}

// wrapper utils function to stop propagation for a given event
export function stopPropagation(e: Event) {
    e.stopPropagation();
}

// prints a given message only in development build
export function debugLog(message: string) {
    if (!isProduction()) {
        console.log(message)
    }
}

//#endregion

// #region scrolling utils
// calculate if a given html element has a horizontal scrollbar
export function hasHorizontalScrollbar(el: HTMLElement) {
    return el.scrollWidth > el.clientWidth;
}

// calculate if a given html element has a vertical scrollbar
export function hasVerticalScrollbar(el: HTMLElement) {
    return el.scrollHeight > el.clientHeight;
}

// check if a given element is fully scrolled
export function isElementFullyScrolled(el: HTMLElement): boolean {
    return el.scrollWidth - el.scrollLeft === el.clientWidth
}

//#endregion