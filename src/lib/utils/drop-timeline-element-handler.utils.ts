import { type ITimelineDraggedElementData, type ITimelineElement, type ITimelineElementBounds, type ITimelineTrack, TimelineDropArea } from "$lib/interfaces/Timeline";
import { get } from "svelte/store";
import { draggedElementHover, draggedElementPosition, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";
import { convertPxToMs } from "./utils";
import {
    cleanUpEmptyTracks,
    createTrackWithElement
} from "./timeline.utils";
import { resolveTimelineElementDrop } from './timeline-drop.utils';
import { runTimelineEdit } from './timeline-history.utils';

/**
 * this function is registered on page mount as a callback to the timeline element drop event and handles the dropped element depending on where it got dropped
 */
export const dropTimelineElementHandler = (e: CustomEvent<ITimelineDraggedElementData>) => {
    // re-assign used properties from event details
    const draggedData = e.detail
    const prevTrackIndex = draggedData.prevTrackIndex
    const prevElementIndex = draggedData.prevElementIndex
    const elementData = draggedData.data

    // get the final position of the dragged element
    const elementPosition = get(draggedElementPosition)

    if (!elementPosition) {
        return
    }

    const elementPositionY = elementPosition.clickedY

    // get the timeline tracks before the dragged element is removed
    const tracks = get(timelineTracks)

    // get amount of dividers and tracks
    const amountOfDividers = tracks.length + 1
    const amountOfTracks = tracks.length

    // calculate total height of timeline elements
    const totalHeight = (amountOfDividers * CONSTS.timelineDividerElementHeight) + (amountOfTracks * CONSTS.timelineRowElementHeight)

    // find out where element was dropped by using the dropped Y value
    let dropArea = TimelineDropArea.TIMELINE

    // keep track of the drop area that we need to check next
    let currentDropArea = TimelineDropArea.DIVIDER
    let tempY = 0
    let droppedDividerIndex = 0
    let droppedRowIndex = 0
    const droppedAboveElements = elementPositionY < 0

    // if the y position is less than 0 or more than the total height, the element was dropped above the first divider or under the last divider so we can keep the drop area as the timeline
    if (elementPositionY > 0 && elementPositionY < totalHeight) {

        // loop through each divider/track row and find out where the element was dropped using the y position 
        while (tempY < totalHeight && dropArea === TimelineDropArea.TIMELINE) {

            if (currentDropArea === TimelineDropArea.DIVIDER) {
                // check if y is between start and end of the current divider, if yes overwrite divider as the drop area and break out of loop
                if (elementPositionY > tempY && elementPositionY < tempY + CONSTS.timelineDividerElementHeight) {
                    dropArea = TimelineDropArea.DIVIDER
                    break;
                }

                // increment internal y value with the height of a divider, increment divider index by 1 and set track as the next value for the loop iteration
                tempY += CONSTS.timelineDividerElementHeight
                currentDropArea = TimelineDropArea.TRACK
                droppedDividerIndex += 1
            } else {
                // check if y is between start and end of the current row, if yes overwrite track as the drop area and break out of loop
                if (elementPositionY > tempY && elementPositionY < tempY + CONSTS.timelineRowElementHeight) {
                    dropArea = TimelineDropArea.TRACK
                    break;
                }

                // increment internal y value with the height of a track, increment row index by 1 and set divider as the next value for the loop iteration
                tempY += CONSTS.timelineRowElementHeight
                currentDropArea = TimelineDropArea.DIVIDER
                droppedRowIndex += 1
            }

        }
    }


    // handle the element drop differently depending on where the element was dropped (timeline, divider or track)
    switch (dropArea) {

        // element dropped either above or below the timeline elements
        case TimelineDropArea.TIMELINE: {

            // new index will be the same index as either the first divider or the last one, depending on if was dropped above or below the timeline elements
            const newIndex = droppedAboveElements ? 0 : tracks.length

            runTimelineEdit(() => timelineTracks.update(prevTracks => {

                // create new track, add dragged element into it and remove old one 
                prevTracks = moveElementToNewTrack(prevTracks, elementData, prevTrackIndex, prevElementIndex, newIndex)

                return prevTracks
            }))

            break;
        }

        // element dropped on a timeline divider
        case TimelineDropArea.DIVIDER: {

            runTimelineEdit(() => timelineTracks.update(prevTracks => {

                // create new track, add dragged element into it and remove old one 
                prevTracks = moveElementToNewTrack(prevTracks, elementData, prevTrackIndex, prevElementIndex, droppedDividerIndex)


                return prevTracks
            }))

            break;
        }

        // element dropped on a timeline track
        case TimelineDropArea.TRACK: {

            // get position of dropped element along the x axis
            const xWithoutOffset = elementPosition.left - CONSTS.timelineRowOffset;
            const x = xWithoutOffset < CONSTS.timelineRowOffset ? 0 : xWithoutOffset;
            const elementEnd = x + draggedData.width;

            // convert the dragged element bounds from px into ms
            const elBoundsInMs: ITimelineElementBounds = {
                start: convertPxToMs(x),
                end: convertPxToMs(elementEnd)
            };


            // update the current tracks in the store with the newly moved element
            runTimelineEdit(() => timelineTracks.update((prevTracks) => {
				// clone changed collections so older history snapshots remain immutable
				const nextTracks = prevTracks.map((track) => ({
					...track,
					elements: [...track.elements]
				}));

                // get the dragged element from the previous track
                const foundEl = nextTracks[prevTrackIndex].elements[prevElementIndex];

                // element was moved in the same track
                if (prevTrackIndex === droppedRowIndex) {
                    // resolve the drop and keep the destination track chronologically ordered
                    nextTracks[droppedRowIndex].elements = resolveTimelineElementDrop(
                        nextTracks[droppedRowIndex].elements,
                        foundEl,
                        elBoundsInMs
                    );
                }
                // element was dragged onto a different track
                else {
                    // remove dragged element from old track
                    nextTracks[prevTrackIndex].elements.splice(prevElementIndex, 1);

                    nextTracks[droppedRowIndex].elements = resolveTimelineElementDrop(
                        nextTracks[droppedRowIndex].elements,
                        foundEl,
                        elBoundsInMs
                    );

                    // clean up old track if its empty now
                    cleanUpEmptyTracks(nextTracks);
                }

                return nextTracks;
            }));

            break;
        }

        default:
            // shouldn't be reachable
            console.error(`No correct drop area was provided: drop area '${dropArea}' not defined`)
            break;
    }

    // reset the hovered over store value
    draggedElementHover.set(null)

}

// create the given element in a new track and remove old one
function moveElementToNewTrack(
    tracks: ITimelineTrack[],
    elementData: ITimelineElement,
    prevTrackIndex: number,
    prevElementIndex: number,
    newIndex: number
): ITimelineTrack[] {
	// copy each mutable collection before using the existing placement helpers
	tracks = tracks.map((track) => ({ ...track, elements: [...track.elements] }));
    const track = createTrackWithElement(elementData);

    // remove dragged element from track
    tracks[prevTrackIndex].elements.splice(prevElementIndex, 1);

    // add new track that includes the dragged element
    tracks.splice(newIndex, 0, track);

    // clean up old track if its empty now
    cleanUpEmptyTracks(tracks);

    return tracks
}
