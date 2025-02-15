import { TimelineDropArea, type ITimelineDraggedElementPosition } from "$lib/interfaces/Timeline";
import { get } from "svelte/store";
import { draggedElementData, draggedElementHover, draggedOverThreshold, isTimelineElementBeingDragged, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";

/**
 * this function is called everytime the `draggedElementPosition` value changes in store
 */
export const hoverTimelineElementHandler = (position: ITimelineDraggedElementPosition | null, timelineScrollContainer: HTMLDivElement) => {
    const draggedData = get(draggedElementData)
    // const timelineScrollContainer = document.getElementById('timeline-scroll-container')

    if (!position ||
        !timelineScrollContainer ||
        !get(draggedOverThreshold) ||
        !get(isTimelineElementBeingDragged) ||
        !draggedData) {
        return
    }

    const elementPositionY = position.clickedY

    // get the timeline tracks before the dragged element is removed
    const tracks = get(timelineTracks)

    // get amount of dividers and tracks
    const amountOfDividers = tracks.length + 1
    const amountOfTracks = tracks.length

    // calculate total height of timeline elements
    const totalHeight = (amountOfDividers * CONSTS.timelineDividerElementHeight) + (amountOfTracks * CONSTS.timelineRowElementHeight)

    // find out where element is hovered by using the dropped Y value
    let hoverArea: TimelineDropArea | null = null

    // keep track of the drop area that we need to check next
    let currentDropArea = TimelineDropArea.DIVIDER
    let tempY = 0
    let hoverDividerIndex = 0
    let hoverRowIndex = 0
    let hoverAboveElements = elementPositionY < 0

    // if the y position is less than 0 or more than the total height, the element is being hovered above the first divider or under the last divider
    if (elementPositionY > 0 && elementPositionY < totalHeight) {

        // loop through each divider/track row and find out where the element was dropped using the y position 
        while (tempY < totalHeight && hoverArea === null) {

            if (currentDropArea === TimelineDropArea.DIVIDER) {
                // check if y is between start and end of the current divider, if yes overwrite divider as the drop area and break out of loop
                if (elementPositionY > tempY && elementPositionY < tempY + CONSTS.timelineDividerElementHeight) {
                    hoverArea = TimelineDropArea.DIVIDER
                    break;
                }

                // increment internal y value with the height of a divider, increment divider index by 1 and set track as the next value for the loop iteration
                tempY += CONSTS.timelineDividerElementHeight
                currentDropArea = TimelineDropArea.TRACK
                hoverDividerIndex += 1
            } else {
                // check if y is between start and end of the current row, if yes overwrite track as the drop area and break out of loop
                if (elementPositionY > tempY && elementPositionY < tempY + CONSTS.timelineRowElementHeight) {
                    hoverArea = TimelineDropArea.TRACK
                    break;
                }

                // increment internal y value with the height of a track, increment row index by 1 and set divider as the next value for the loop iteration
                tempY += CONSTS.timelineRowElementHeight
                currentDropArea = TimelineDropArea.DIVIDER
                hoverRowIndex += 1
            }

            // console.log("hoverTimelineElementHandler while -> tempY:", tempY, "hoverDividerIndex:", hoverDividerIndex, "hoverRowIndex:", hoverRowIndex);
        }
    } else {
        hoverArea = TimelineDropArea.TIMELINE
    }

    // console.log("hoverTimelineElementHandler called -> position:", position, "amountOfDividers/amountOfTracks:", amountOfDividers, "/", amountOfTracks, "totalHeight:", totalHeight, "hoverArea:", hoverArea, "hoverIndex:", hoverArea === TimelineDropArea.DIVIDER ? hoverDividerIndex : hoverRowIndex, "hoverAboveElements:", hoverAboveElements);

    // handle the element drop differently depending on where the element was is hovered (timeline, divider or track)
    switch (hoverArea) {

        // element hover either above or below the timeline elements
        case TimelineDropArea.TIMELINE:

            // new index will be the same index as either the first divider or the last one, depending on if it is hovered above or below the timeline elements
            const newIndex = hoverAboveElements ? 0 : tracks.length

            // set the store value with updated values
            draggedElementHover.set({ dropArea: TimelineDropArea.DIVIDER, index: newIndex })

            break;

        // element hovered over a timeline divider
        case TimelineDropArea.DIVIDER:

            // set the store value with updated values
            draggedElementHover.set({ dropArea: TimelineDropArea.DIVIDER, index: hoverDividerIndex })

            break;

        // element hover over a timeline track
        case TimelineDropArea.TRACK:

            // limit the drop zone offset to the left so it doesn't go further left than the track
            const leftOffset = Math.max(position.left, CONSTS.timelineRowOffset)

            // set the store value with updated values
            draggedElementHover.set(
                {
                    dropArea: TimelineDropArea.TRACK,
                    index: hoverRowIndex,
                    width: draggedData.width,
                    leftOffset
                })

            break;

        default:

            // shouldn't be reachable
            console.error(`No correct hover area was provided: hover area '${hoverArea}' not defined`)

            // reset the hovered over store value
            draggedElementHover.set(null)
            break;
    }



}