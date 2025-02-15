// this function is registered on page mount as a callback to the timeline element drop event

import { type ITimelineDraggedElementData, TimelineDropArea } from "$lib/interfaces/Timeline";
import { get } from "svelte/store";
import { draggedElementPosition, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";

// it handles the dropped element depending on where it got dropped
export const dropTimelineElementHandler = (e: CustomEvent<ITimelineDraggedElementData>) => {
    const eventDetail = e.detail
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
                if (elementPositionY > tempY && elementPositionY < tempY + CONSTS.timelineDividerElementHeight) {
                    dropArea = TimelineDropArea.DIVIDER
                    break;
                }
                tempY += CONSTS.timelineDividerElementHeight
                currentDropArea = TimelineDropArea.TRACK
                droppedDividerIndex += 1
            } else {
                if (elementPositionY > tempY && elementPositionY < tempY + CONSTS.timelineRowElementHeight) {
                    dropArea = TimelineDropArea.TRACK
                    break;
                }
                tempY += CONSTS.timelineRowElementHeight
                currentDropArea = TimelineDropArea.DIVIDER
                droppedRowIndex += 1
            }

            console.log("dropTimelineElementHandler while -> tempY:", tempY, "droppedDividerIndex:", droppedDividerIndex, "droppedRowIndex:", droppedRowIndex);
        }
    }

    console.log("dropTimelineElementHandler called -> eventDetail:", eventDetail, "elementPosition:", elementPosition, "tracks:", tracks, "amountOfDividers/amountOfTracks:", amountOfDividers, "/", amountOfTracks, "totalHeight:", totalHeight, "dropArea:", dropArea, "droppedIndex:", dropArea === TimelineDropArea.DIVIDER ? droppedDividerIndex : droppedRowIndex, "droppedAboveElements:", droppedAboveElements);

    // find out where the element was dropped by having a store value that keeps track of where the element was last hovered over. We can maybe listen to the dragged element position change in the timeline and in there have all the logic


    // handle the element drop differently depending on where the element was dropped (timeline, divider or track)
    switch (dropArea) {
        // element dropped either above or below the timeline elements
        case TimelineDropArea.TIMELINE:
            break;

        // element dropped on a timeline divider
        case TimelineDropArea.DIVIDER:
            break;

        // element dropped on a timeline track
        case TimelineDropArea.TRACK:
            break;

        default:
            // shouldn't be reachable
            console.error(`No correct drop area was provided: drop area '${dropArea}' not defined`)
            break;
    }

}