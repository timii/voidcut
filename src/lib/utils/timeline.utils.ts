import {
    type ITimelineElementIndeces,
    type ITimelineElement,
    type ITimelineElementBounds,
    type ITimelineTrack,
    TimelineElementResizeSide,
    TimelineDropArea
} from "$lib/interfaces/Timeline";
import { get } from "svelte/store";
import {
    currentTimelineScale,
    isThumbBeingDragged,
    isTimelineElementBeingDragged,
    isTimelineElementBeingResized,
    selectedElement,
    horizontalScroll,
    maxPlaybackTime,
    currentPlaybackTime,
    currentThumbPosition,
    timelineTracks,
    maxTimelineScale,
    minTimelineScale,
    possibleScaleValues,
    elementResizeData
} from "../../stores/store";
import { CONSTS } from "./consts";
import { onlyPrimaryButtonClicked, convertPxToMs, generateId } from "./utils";
import { type IMedia } from "$lib/interfaces/Media";
import { handleTimelineMediaDrop } from "./file.utils";

let timelineScrollContainer: Element | null

// read media data from dropped element and prepare it to pass it on 
export function mediaDropOnTimeline(e: DragEvent, dropArea: TimelineDropArea, rowIndex?: number, startTime?: number) {
    // prevent default behavior
    e.preventDefault();
    e.stopPropagation();

    // get data from dropped element
    let mediaDataString = e.dataTransfer?.getData(CONSTS.mediaPoolTransferKey);

    if (!mediaDataString) {
        return;
    }

    // parse it back to be an object again
    const mediaData: IMedia = JSON.parse(mediaDataString);

    // only handle files when actually dropped
    if (!mediaData || e.type === 'dragleave') {
        return;
    }

    handleTimelineMediaDrop(mediaData, dropArea, rowIndex, startTime);
}

// checks whether to resize on the left or right side of the element  
export function handleElementResizing(e: MouseEvent) {
    // avoid the thumb being also moved to where the handle is
    e.stopPropagation();
    e.stopImmediatePropagation();

    // if another element or thumg being dragged don't resize
    if (get(isTimelineElementBeingDragged) || get(isThumbBeingDragged)) {
        return;
    }

    // don't resize if not only primary button is clicked
    if (!onlyPrimaryButtonClicked(e)) {
        return;
    }

    const elResizeData = get(elementResizeData)

    // if no resize side is given we can't decide what side to handle
    if (!elResizeData) {
        return
    }

    const eventDetail = { detail: { event: e, elementId: elResizeData.timelineElementId } }

    // handle left side resizing
    if (elResizeData.side === TimelineElementResizeSide.LEFT) {
        // create and dispatch custom event with the mouse event in the detail. The TimelineRowElement component listens to the event and handles the resizing
        const event = new CustomEvent(CONSTS.customEventNameElementResizeLeft, eventDetail);
        window.dispatchEvent(event);
    }

    // handle right side resizing
    if (elResizeData.side === TimelineElementResizeSide.RIGHT) {
        // create and dispatch custom event with the mouse event in the detail. The TimelineRowElement component listens to the event and handles the resizing
        const event = new CustomEvent(CONSTS.customEventNameElementResizeRight, eventDetail);
        window.dispatchEvent(event);

    }
}

// check if given element id matches resized element id
export function isCurrentElementBeingResized(el: ITimelineElement): boolean {
    const elResizeData = get(elementResizeData)

    // if no resize data is given there is no element being resized right now so we return false
    if (!elResizeData) {
        return false
    }

    // return if the id in the store matches the given id
    return elResizeData.timelineElementId === el.elementId
}

// calculate amount the timeline needs to be scrolled by when the thumb reaches the edge (i.e. during playback)
export function getTimelineScrollAmount(): number {
    // get current size (in pixels) of one second using the current timeline scale
    const size = get(currentTimelineScale)
    // calculate the amount of times the thumb is being updated each second
    // 1000 is the amount of millisceonds in a second
    const amountOfThumbUpdates = 1000 / CONSTS.playbackIntervalTimer

    return size / amountOfThumbUpdates
}

// move the timeline thumb using a given mouse event
export function moveTimelineThumb(e: MouseEvent, keepSelectedElement = false) {
    e.preventDefault();

    // check if the original click is over a timeline element
    const clickOriginOverElement = (e.target as HTMLElement).classList.contains('timeline-row-element') || (e.target as HTMLElement).classList.contains('timeline-row-element-handle')

    const originNotOverElOrThumbAlreadyMoving = !clickOriginOverElement || get(isThumbBeingDragged)

    // only move thumb if only the primary button is clicked, nothing else is being dragged/resized and the click origin is not over an element
    const moveThumb = onlyPrimaryButtonClicked(e) && !get(isTimelineElementBeingDragged) && !get(isTimelineElementBeingResized) && originNotOverElOrThumbAlreadyMoving

    // check if we should move the thumb or if something else is already being dragged/resized/etc.
    if (!moveThumb) {
        return
    }

    // if an element is selected reset it if the thumb is moved and we don't want to keep the selected element
    if (isAnElementSelected() && !keepSelectedElement) {
        selectedElement.set({ elementId: '', mediaType: undefined })
    }

    const thumbBoundingRect = document.getElementById('timeline-thumb')?.getBoundingClientRect()
    if (!thumbBoundingRect) {
        return
    }

    if (!timelineScrollContainer) {
        timelineScrollContainer = document.getElementById('timeline-scroll-container')
    }

    const hs = get(horizontalScroll)

    // calculate new position using the mouse position on the x axis and subtracting the left offset from it
    const newPos = e.clientX - CONSTS.timelineRowOffset;

    // convert the new position into ms, but include the horizontal scroll (in ms)
    const playbackTime = convertPxToMs(newPos + hs);

    // avoid the thumb to be moved further left than the tracks and further to the right than the max playback time 
    if ((newPos < 0 && hs <= CONSTS.timelineRowOffset) || playbackTime > get(maxPlaybackTime)) {
        return
    }

    currentPlaybackTime.set(playbackTime);
    currentThumbPosition.set(newPos);

    if (!get(isThumbBeingDragged)) {
        isThumbBeingDragged.set(true);
    }
}

// get index of selected timeline element that matches in all tracks
// if no element selected or no element found return undefined 
export function getIndexOfSelectedElementInTracks(): ITimelineElementIndeces | undefined {
    const tracks = get(timelineTracks)
    const selectedElementId = get(selectedElement).elementId

    // if there is no element selected return undefined
    if (!selectedElementId) {
        return;
    }

    for (let rowIndex = 0; rowIndex < tracks.length; rowIndex++) {
        // search for and get the index of the element inside current track
        let elementIndex = tracks[rowIndex].elements.findIndex(el => el.elementId === selectedElementId);

        // if an element has been found in the current track we return both the row and element index
        if (elementIndex > -1) {
            return { rowIndex, elementIndex };
        }
    }

    return;
}

// check if we are currently at the maximum timeline scale
export function isAtMaxTimelineScale() {
    return get(currentTimelineScale) >= get(maxTimelineScale)
}

// check if we are currently at the minimum timeline scale
export function isAtMinTimelineScale() {
    return get(currentTimelineScale) <= get(minTimelineScale)
}

// check if an element is currently selected on the timeline
export function isAnElementSelected(): boolean {
    const selectedElementRef = get(selectedElement)
    return !!selectedElementRef.elementId
}

// checks if at least one element exists in the timeline
export function doesElementExistInTimeline(): boolean {
    return get(timelineTracks).length > 0
}

// get the next lower scale value compared to the current one
export function getNextLowerScale() {
    const possibleScales = get(possibleScaleValues)
    const currentScale = get(currentTimelineScale)

    // get the next lower value by going through all possible values in the reverse order and returning the first value that is lower than the current scale
    // we can do it this way since we know that the possible values are sorted in ascending order
    for (let i = possibleScales.length - 1; i > 0; i--) {
        if (possibleScales[i] < currentScale) {
            return possibleScales[i]
        }
    }

    // if we weren't able to find a value we return the lowest scale value
    return possibleScales[0]
}

// get the next higher scale value compared to the current one
export function getNextHigherScale() {
    const possibleScales = get(possibleScaleValues)
    const currentScale = get(currentTimelineScale)

    // get the next higher value by going through all possible values and returning the first value that is higher than the current scale
    // we can do it this way since we know that the possible values are sorted in ascending order
    for (let i = 0; i < possibleScales.length; i++) {
        if (possibleScales[i] > currentScale) {
            return possibleScales[i]
        }
    }

    // if we weren't able to find a value we return the highest scale value
    return possibleScales[possibleScales.length - 1]
}

// add a given element to a given timeline and update its playback start time
export function addElementToTimeline(trackEls: ITimelineElement[], newIndex: number, newElement: ITimelineElement, newStartTime: number): ITimelineElement[] {
    // add the new element directly after current element
    trackEls.splice(newIndex, 0, newElement);

    // update the playback start time of new element
    trackEls[newIndex] = {
        ...newElement,
        playbackStartTime: newStartTime // new playback start time is at the end of the previous element to put it directly after it
    };

    // automatically select duplicated element
    selectedElement.set({ elementId: newElement.elementId, mediaType: newElement.type });

    return trackEls;
}

// check if the thumb is currently over the selected element and if yes, return the ms where it is over the element
// return -1 otherwise
export function thumbOverSelectedElement(): number {
    // check if an element is even selected, if not the thumb can't be over the selected element
    if (!isAnElementSelected()) {
        return -1
    }

    // get indeces of selected element in timeline
    const indeces = getIndexOfSelectedElementInTracks()

    if (!indeces) {
        return -1
    }

    const tracks = get(timelineTracks)
    const element = tracks[indeces.rowIndex].elements[indeces.elementIndex]

    // get bounds of selected element
    const elementBounds: ITimelineElementBounds =
    {
        start: element.playbackStartTime,
        end: element.playbackStartTime + element.duration
    }

    // get current position of timeline thumb in ms
    const thumbPosition = get(currentPlaybackTime)

    // check if the thumb is between start and end bounds of selected element including the mind width offset on both ends to not be able to split element to be less than the minimum width
    const thumbAfterStart = thumbPosition > elementBounds.start + CONSTS.timelineElementMinWidthMs
    const thumbBeforeEnd = thumbPosition < elementBounds.end - CONSTS.timelineElementMinWidthMs
    const thumbOverEl = thumbAfterStart && thumbBeforeEnd

    // return the thumb position over the element or -1 if thats not the case
    return thumbOverEl ? thumbPosition - elementBounds.start : -1
}

// check if a given element overlaps with any element on a given track
export function isElementOverlapping(elBounds: ITimelineElementBounds, trackEls: ITimelineElement[], ignoreElIndex?: number): boolean {
    return trackEls.some((trackEl, i) => {
        const trackElStart = trackEl.playbackStartTime
        const trackElEnd = trackEl.playbackStartTime + trackEl.duration

        // ignore this element when checking for overlapping
        if (ignoreElIndex !== undefined && i === ignoreElIndex) {
            return false
        }

        if ((elBounds.start >= trackElStart && elBounds.start < trackElEnd) || (elBounds.end > trackElStart && elBounds.end <= trackElEnd)) {
            return true
        }
    })
}

// wrapper function that handles all the overlapping logic when moving an element, returns the updated track elements
export function handleOverlapping(newElBounds: ITimelineElementBounds, trackEls: ITimelineElement[], index?: number): ITimelineElement[] {
    // check if the new position of the element overlaps with any other element on the track
    const isOverlapping = isElementOverlapping(
        newElBounds,
        trackEls,
        index
    );

    // if the element overlaps with any other element we move the elements accordingly so the element can fit on the track
    if (isOverlapping) {
        trackEls = moveElementsOnTrack(
            newElBounds,
            trackEls,
            index
        );
    }

    return trackEls
}

// get the element end time for the next element on the left side of a given element on a given track
export function getNextLeftElementEndTime(trackIndex: number, elementIndex: number): number | undefined {
    // if the given element is the first in the track we can directly return undefined
    if (elementIndex === 0) {
        undefined
    }

    const tracks = get(timelineTracks)

    // handle the case where we pass a track or element index that is out of bounds 
    if (trackIndex > tracks.length || elementIndex > tracks[trackIndex].elements.length) {
        return undefined
    }

    // get the element in the track just before the given element index
    const elementBefore = tracks[trackIndex].elements[elementIndex - 1]

    if (!elementBefore) {
        return undefined
    }

    // return the end time of the element in milliseconds
    return elementBefore.playbackStartTime + elementBefore.duration
}

// get the element start time for the next element on the right side of a given element on a given track
export function getNextRightElementStartTime(trackIndex: number, elementIndex: number): number | undefined {
    const tracks = get(timelineTracks)

    // handle the case where we pass a track or element index that is out of bounds 
    if (trackIndex > tracks.length || elementIndex > tracks[trackIndex].elements.length) {
        return undefined

    }

    // if the given element is the last element in the track we can directly return undefined
    if (elementIndex === tracks[trackIndex].elements.length - 1) {
        undefined
    }

    // get the element in the track just after the given element index
    const elementAfter = tracks[trackIndex].elements[elementIndex + 1]

    if (!elementAfter) {
        return undefined
    }

    // return the start time of the element in milliseconds
    return elementAfter.playbackStartTime
}

// go through a given array of tracks and remove tracks that don't have any elements
export function cleanUpEmptyTracks(tracks: ITimelineTrack[]) {
    if (tracks.length === 0) {
        return tracks
    }

    // loop through the tracks in reverse (to not mess up the indeces when deleting)
    for (let i = tracks.length; i > 0; i--) {

        // if the track is empty, remove it
        if (!tracks[i - 1].elements || tracks[i - 1].elements.length === 0) {
            tracks.splice(i - 1, 1)
        }
    }

}

// create an empty track with a given element
export function createTrackWithElement(element: ITimelineElement) {
    return {
        trackId: generateId(),
        elements: [element]
    } as ITimelineTrack
}

// check if a given element is at the correct index inside a given track 
export function isElementAtCorrectIndex(el: ITimelineElement, index: number, trackEls: ITimelineElement[]): boolean {
    // if the track only has one element and the index is 0 we can directly return true since its the only element on the track
    if (trackEls.length === 1 && index === 0) {
        return true
    }

    // handle the case where the index is bigger than the track length
    if (index > trackEls.length - 1) {
        console.error(`Error checking if the element is at the correct index: index ${index} is bigger than the track length`)
        return true
    }

    // keep track of the element before and after the index
    let elementBefore: ITimelineElement | undefined
    let elementAfter: ITimelineElement | undefined

    // if the element is not the first element we get the element before 
    if (index > 0) {
        elementBefore = trackEls[index - 1]
    }

    // if the element is not the last element we get the element after 
    if (index < trackEls.length - 1) {
        elementAfter = trackEls[index + 1]
    }

    // check if the playback start time of the element before is after the start of the given element
    const isElementBeforeStartTimeSmallerThanElStartTime = elementBefore !== undefined && elementBefore.playbackStartTime < el.playbackStartTime

    // check if the playback start time of the element after is before the start of the given element
    const isElementAfterStartTimeBiggerThanElStartTime = elementAfter !== undefined && elementAfter.playbackStartTime > el.playbackStartTime

    // return if both the element before and after have a correct playback start time relative to the given element
    return (isElementBeforeStartTimeSmallerThanElStartTime || elementBefore === undefined) && (isElementAfterStartTimeBiggerThanElStartTime || elementAfter === undefined)
}

// sort a given track by playbackStartTime
export function moveElementToCorrectIndex(el: ITimelineElement, index: number, trackEls: ITimelineElement[]): ITimelineElement[] {
    // naive solution of just sorting the array by the playbackStartTime, could be performing worse with more elements
    // trackEls.sort((a, b) => a.playbackStartTime - b.playbackStartTime)

    // handle the case where the index is bigger than the track length
    if (index > trackEls.length - 1) {
        console.error(`Error checking if the element is at the correct index: index ${index} is bigger than the track length`)
        return trackEls
    }

    const startingTrackLength = [...trackEls].length

    // remove element from array using its previous index
    trackEls.splice(index, 1)

    for (let i = 0; i < trackEls.length; i++) {
        // keep track if the current element start time is after the element start time
        const curStartTimeAfterElement = trackEls[i].playbackStartTime > el.playbackStartTime

        // if the start time of the current element is before the element we can directly jump to the next iteration in the loop
        if (!curStartTimeAfterElement) {
            continue
        }

        // add the element at the current index since the current element will be pushed after the element has been added
        trackEls.splice(i, 0, el)

        // we moved the element so we can break out of the loop
        break;
    }

    // if no element had a start time after the given element we just push it to the back
    if (trackEls.length < startingTrackLength) {
        trackEls.push(el)
    }

    return trackEls
}

// wrapper function that handles all the logic for checking and updating if a given element is at the correct index after moving, returns the updated track elements
export function handleElementIndeces(newEl: ITimelineElement, newElStartTime: number, trackEls: ITimelineElement[], index: number, pushElFirst?: boolean): ITimelineElement[] {
    // update the playback start time for the moved element
    newEl.playbackStartTime = newElStartTime;

    // for moving an element from a different track we first add the element to the end of the track and then check if the index is correct or if we need to update it
    if (pushElFirst) {
        trackEls.push(newEl)
    }

    // check if the index of the element inside the track is still correct after changing the playbackStartTime, if not we need to update it
    if (!isElementAtCorrectIndex(newEl, index, trackEls)) {
        //  update the element index inside the track
        trackEls = moveElementToCorrectIndex(
            newEl,
            index,
            trackEls
        );
    }
    return trackEls;
}

// move a given list of timeline elements according to given element bounds so they don't overlap
export function moveElementsOnTrack(elBounds: ITimelineElementBounds, trackEls: ITimelineElement[], sameTrackElIndex?: number) {
    let moveAmount: number | undefined = undefined

    // keep track if we already moved the first overlapping element
    let firstElementAdjusted = false

    const tracks = trackEls.map((trackEl, i) => {
        // calculate the bounds of current element 
        const trackElBounds: ITimelineElementBounds = { start: trackEl.playbackStartTime, end: trackEl.playbackStartTime + trackEl.duration }

        const sameTrackAndSameIndex = sameTrackElIndex !== undefined && i === sameTrackElIndex

        // check for the first element the dropped element overlaps and get the amount the overlapped element needs to be moved to the right
        if (isElementOverlapping(elBounds, [trackEl]) && moveAmount === undefined && !sameTrackAndSameIndex) {
            moveAmount = elBounds.end - trackElBounds.start;
        }

        // now that the first element has been adjusted we also want to check if and, if yes, by how much we need to move the following elements
        if (moveAmount !== undefined && firstElementAdjusted) {
            // get the previous element with its updated end time
            const prevEl = trackEls[i - 1]
            const newPrevElEndTime = prevEl.playbackStartTime + prevEl.duration

            // check if we need to move this element as well by checking if it now overlaps with the previous element that was updated
            const elementOverlapping = newPrevElEndTime > trackElBounds.start

            // if the current element now overlaps with the previous one we update the current playback start time to be the end time of the previous element to move it directly behind the previous element 
            if (elementOverlapping) {
                trackEl.playbackStartTime = newPrevElEndTime
            }
        }

        // if moveAmount is defined and no element has been adjusted yet, move the current element by that amount
        if (moveAmount !== undefined && !firstElementAdjusted) {
            trackEl.playbackStartTime += moveAmount

            // we now adjusted the first overlapping element so we keep track of that
            firstElementAdjusted = true
        }

        return trackEl
    })

    return tracks
}

// get timeline track from the DOM and return its bounding rect
export function getTimelineTracksBoundingRect(): DOMRect {
    const tracksEl = document.getElementsByClassName('timeline-tracks')[0];
    return tracksEl.getBoundingClientRect();
}