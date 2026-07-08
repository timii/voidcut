import type { DragEventData } from '@neodrag/svelte';
import type { MediaType } from './Media';

export interface ITimelineElement {
	elementId: string; // unique id of timeline element
	mediaId: string; // unique id of media
	mediaName: string; // name of media
	mediaImage: string; // preview image of the media
	timelineImage?: string; // image used in the timeline element
	timelineFrames?: string[]; // frames used in the timeline element for video filmstrips
	type: MediaType; // enum type of element
	duration: number; // current duration in milliseconds (can be different after element has been resized)
	maxDuration: number | undefined; // maximum duration in milliseconds (if undefined the element can be resized as much as the user wants to)
	playbackStartTime: number; // time on timeline where element starts in miliseconds
	trimFromStart: number; // how much is trimmed from the start in milliseconds
	trimFromEnd: number; // how much is trimmed from the end in milliseconds
	settings: TimelineElementSettings; // editable settings applied to the element in preview and export
}

export interface IAudioTimelineElementSettings {
	volume: number;
	fadeInMs: number;
	fadeOutMs: number;
	speed: TimelineElementSpeed;
}

export interface IVideoTimelineElementSettings {
	flipHorizontal: boolean;
	flipVertical: boolean;
	volume: number;
	speed: TimelineElementSpeed;
	opacity: number;
}

export interface IImageTimelineElementSettings {
	flipHorizontal: boolean;
	flipVertical: boolean;
	opacity: number;
}

export type TimelineElementSettings =
	| IAudioTimelineElementSettings
	| IVideoTimelineElementSettings
	| IImageTimelineElementSettings;

export type TimelineElementSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

// parent element for each track(row) in the timeline
export interface ITimelineTrack {
	trackId: string; // unique id of timeline track
	elements: ITimelineElement[]; // array to hold each element on the current track
}

export interface ITimelineDraggedElementPosition {
	left: number; // amount of pixels from the left inside the parent container
	top: number; // amount of pixels from the top inside the parent container
	clickedX: number; // where in the element the mouse clicked
	clickedY: number; // where in the element the mouse clicked
	startX: number; // starting x position when starting to drag
	startY: number; // starting y position when starting to drag
	// absoluteLeft: number;  // amount of pixels from the left inside the viewport
	// absoluteTop: number;  // amount of pixels from the top inside the viewport
}

export interface ITimelineDraggedElementData {
	width: number; // width of the dragged timeline element
	height: number; // height of the dragged timeline element
	elementId: string; // timline element id
	data: ITimelineElement; // all the information about the dragged element
	eventDetail: DragEventData; // all the information from the drag event detail
	prevTrackIndex: number; // the previous track index of the dragged element
	prevElementIndex: number; // the element index inside the previous track of the dragged element
}

export interface ITimelineDraggedElementHover {
	dropArea: TimelineDropArea; // over what kind of element it is currently hovered over
	index: number; // index of the element the element is hovered over
	leftOffset?: number; // left offset of dragged element (only used when hovered over track row)
	width?: number; // width of the dragged element (only used when hovered over track row)
}

export interface ITimelineElementBounds {
	start: number; // start of the timeline element (in milliseconds)
	end: number; // end of the timeline element (in milliseconds)
}

export interface ITimelineNextElementBounds {
	nextLeftEl: number | undefined; // the amount of milliseconds where the next element is to the left, undefined if no element to the left
	nextRightEl: number | undefined; // the amount of milliseconds where the next element is to the right, undefined if no element to the right
}

export interface ITimelineElementResizeData {
	side: TimelineElementResizeSide; // which side of the timeline element is being resized
	timelineElementId: string; // the unique id of the element that is bein resized
	nextElBounds: ITimelineNextElementBounds; // the bounds of the next elements to the left and right
}

export interface ISelectedElement {
	elementId: string; // the elementId of the selected element
	mediaType?: MediaType; // what type of media the selected element is
}

export interface ITimelineElementIndeces {
	rowIndex: number; // the index of the track/row
	elementIndex: number; // the index of the element inside the track/row
}

export enum TimelineElementResizeSide {
	LEFT = 'left',
	RIGHT = 'right'
}

export enum TimelineDropArea {
	TIMELINE = 'timeline',
	TRACK = 'track',
	DIVIDER = 'divider'
}
