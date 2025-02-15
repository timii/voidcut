// this function is registered on page mount as a callback to the timeline element drop event

import { type ITimelineDraggedElementData, type ITimelineElement, type ITimelineElementBounds, type ITimelineTrack, TimelineDropArea } from "$lib/interfaces/Timeline";
import { get } from "svelte/store";
import { draggedElementPosition, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";
import { cleanUpEmptyTracks, convertPxToMs, createTrackWithElement, handleElementIndeces, handleOverlapping } from "./utils";

// it handles the dropped element depending on where it got dropped
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
    let droppedAboveElements = elementPositionY < 0

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

            console.log("dropTimelineElementHandler while -> tempY:", tempY, "droppedDividerIndex:", droppedDividerIndex, "droppedRowIndex:", droppedRowIndex);
        }
    }

    console.log("dropTimelineElementHandler called -> eventDetail:", draggedData, "elementPosition:", elementPosition, "tracks:", tracks, "amountOfDividers/amountOfTracks:", amountOfDividers, "/", amountOfTracks, "totalHeight:", totalHeight, "dropArea:", dropArea, "droppedIndex:", dropArea === TimelineDropArea.DIVIDER ? droppedDividerIndex : droppedRowIndex, "droppedAboveElements:", droppedAboveElements);


    // handle the element drop differently depending on where the element was dropped (timeline, divider or track)
    switch (dropArea) {

        // element dropped either above or below the timeline elements
        case TimelineDropArea.TIMELINE:

            // new index will be the same index as either the first divider or the last one, depending in if was dropped above or below the timeline elements
            const newIndex = droppedAboveElements ? 0 : tracks.length

            timelineTracks.update(prevTracks => {

                // create new track, add dragged element into it and remove old one 
                prevTracks = moveElementToNewTrack(prevTracks, elementData, prevTrackIndex, prevElementIndex, newIndex, dropArea)

                return prevTracks
            })

            break;

        // element dropped on a timeline divider
        case TimelineDropArea.DIVIDER:

            timelineTracks.update(prevTracks => {

                // create new track, add dragged element into it and remove old one 
                prevTracks = moveElementToNewTrack(prevTracks, elementData, prevTrackIndex, prevElementIndex, droppedDividerIndex, dropArea)


                return prevTracks
            })

            break;

        // element dropped on a timeline track
        case TimelineDropArea.TRACK:

            // get position of dropped element along the x axis
            const xWithoutOffset = elementPosition.left - CONSTS.timelineRowOffset;
            const x = xWithoutOffset < CONSTS.timelineRowOffset ? 0 : xWithoutOffset;
            const elementEnd = x + draggedData.width;

            // convert the dragged element bounds from px into ms
            const elBoundsInMs: ITimelineElementBounds = {
                start: convertPxToMs(x),
                end: convertPxToMs(elementEnd)
            };

            console.log(
                'element dropped on track -> dropped element on the x axis:',
                x,
                'elementEnd:',
                elementEnd,
                'elBoundsInMs:',
                elBoundsInMs
            );

            // reset value on drop
            // elementHoveredOverRow = false;

            // update the current tracks in the store with the newly moved element
            timelineTracks.update((prevTracks) => {
                // get the previous track and element index of dragged element
                // const prevTrackIndex = draggedData.prevTrackIndex;
                // const prevElementIndex = draggedData.prevElementIndex;

                console.log(
                    'element dropped on track -> after while old element index:',
                    prevElementIndex,
                    'old trackIndex:',
                    prevTrackIndex,
                    'new track index:',
                    droppedRowIndex,
                    'tracks:',
                    prevTracks
                );

                // get the dragged element from the previous track
                const foundEl = prevTracks[prevTrackIndex].elements[prevElementIndex];

                // TODO: just for logging out element without the long dataUrl, can be removed after testing
                const copy: any = Object.assign({}, foundEl);
                delete copy.mediaImage;

                console.log(
                    'element dropped on track -> after while foundEl:',
                    copy,
                    'trackIndex:',
                    prevTrackIndex,
                    'moved in the same track:',
                    prevTrackIndex === droppedRowIndex
                );

                // element was moved in the same track
                if (prevTrackIndex === droppedRowIndex) {
                    // check and handle if any elements overlap after moving and update the track elements if necessary
                    prevTracks[droppedRowIndex].elements = handleOverlapping(
                        elBoundsInMs,
                        prevTracks[droppedRowIndex].elements,
                        prevElementIndex // we ignore the index of the dragged element so we don't check if the element overlaps with itself
                    );

                    // check and handle if the element with the updated start time is still at the correct index and if not update the track element
                    prevTracks[droppedRowIndex].elements = handleElementIndeces(
                        foundEl,
                        elBoundsInMs.start,
                        prevTracks[droppedRowIndex].elements,
                        prevElementIndex
                    );
                }
                // element was dragged onto a different track
                else {
                    // remove dragged element from old track
                    prevTracks[prevTrackIndex].elements.splice(prevElementIndex, 1);
                    console.log(
                        'element dropped on track -> tracks after element removed from track:',
                        JSON.parse(JSON.stringify(prevTracks))
                    );

                    // check and handle if any elements overlap after moving and update the track elements if necessary
                    prevTracks[droppedRowIndex].elements = handleOverlapping(
                        elBoundsInMs,
                        prevTracks[droppedRowIndex].elements,
                        undefined // we also set this to be undefined since the element was dragged from a different track
                    );

                    // check and handle if the element with the updated start time is still at the correct index and if not update the track elements
                    prevTracks[droppedRowIndex].elements = handleElementIndeces(
                        foundEl,
                        elBoundsInMs.start,
                        prevTracks[droppedRowIndex].elements,
                        prevTracks[droppedRowIndex].elements.length, // we use the current length here and not length - 1 since we will add the element inside the function and then the length will be increased by one and we want the index of the last element
                        true // first push the element onto the new track before re-checking the indeces
                    );

                    // clean up old track if its empty now
                    cleanUpEmptyTracks(prevTracks);
                    console.log(
                        'element dropped on track -> tracks after empty track is removed:',
                        JSON.parse(JSON.stringify(prevTracks))
                    );
                }

                console.log(
                    'element dropped on track -> just before returning tracks -> tracks:',
                    [...prevTracks]
                );
                return prevTracks;
            });

            break;

        default:
            // shouldn't be reachable
            console.error(`No correct drop area was provided: drop area '${dropArea}' not defined`)
            break;
    }

}

// create the given element in a new track and remove old one
function moveElementToNewTrack(
    tracks: ITimelineTrack[],
    elementData: ITimelineElement,
    prevTrackIndex: number,
    prevElementIndex: number,
    newIndex: number,
    dropArea?: string
): ITimelineTrack[] {
    const track = createTrackWithElement(elementData);

    console.log(
        `element dropped on ${dropArea} -> before removing element from track:`,
        JSON.parse(JSON.stringify(tracks)), "newIndex:", newIndex, "prevTrackIndex/prevElementIndex:", prevTrackIndex, "/", prevElementIndex
    );

    // remove dragged element from track
    tracks[prevTrackIndex].elements.splice(prevElementIndex, 1);
    console.log(
        `element dropped on ${dropArea} -> tracks after element removed from track:`,
        JSON.parse(JSON.stringify(tracks))
    );

    // add new track that includes the dragged element
    tracks.splice(newIndex, 0, track);
    console.log(
        `element dropped on ${dropArea} -> tracks after new track has been added:`,
        JSON.parse(JSON.stringify(tracks))
    );

    // clean up old track if its empty now
    cleanUpEmptyTracks(tracks);
    console.log(
        `element dropped on ${dropArea} -> tracks after empty track is removed:`,
        JSON.parse(JSON.stringify(tracks))
    );

    return tracks
}