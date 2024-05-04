import type { MediaType } from "./Media";

export interface ITimelineElement {
    elementId: string, // unique id of timeline element
    mediaId: string, // unique id of media
    type: MediaType, // enum type of element
    duration: number, // duration in milliseconds
    playbackStartTime: number, // time on timeline where element starts (in miliseconds)
    trimFromStart: number, // how much is trimmed from the start (in milliseconds)
    trimFromEnd: number, // how much is trimmed from the end (in milliseconds)
    videoOptions: {} // object to keep track of applied filters of the element (e.g: Blur, Brightness, Volume, etc.)
}

// parent element for each track(row) in the timeline
export interface ITimelineTrack {
    trackId: string; // unique id of timeline track
    elements: ITimelineElement[] // array to hold each element on the current track
}

export interface ITimelineDraggedElement {
    left: number;  // amount of pixels from the left inside the parent container
    top: number;  // amount of pixels from the top inside the parent container
    absoluteLeft: number;  // amount of pixels from the left inside the viewport
    absoluteTop: number;  // amount of pixels from the top inside the viewport
    width: number;
    height: number;
    elementId: string; // timline element id
    clickedX: number;  // where in the element the mouse clicked
    clickedY: number;  // where in the element the mouse clicked
    data: ITimelineElement  // all the information about the dragged element
}