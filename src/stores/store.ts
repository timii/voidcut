import { ExportState } from '$lib/interfaces/Ffmpeg';
import type { IMedia } from '$lib/interfaces/Media';
import type { ITimelineDraggedElement, ITimelineDraggedElementData, ITimelineDraggedElementPosition, ITimelineTrack } from '$lib/interfaces/Timeline';
import { writable } from 'svelte/store';

// General
export const windowWidth = writable(0) // current window width in ms

// Ffmpeg
export const ffmpegLoaded = writable(false)
export const exportOverlayOpen = writable(false)
export const ffmpegProgress = writable(0) // track the progress of ffmpeg in percent
export const ffmpegProgressPrevValue = writable(0) // track the previous value for progress of ffmpeg
export const ffmpegProgressElapsedTime = writable(0) // track the elapsed time since the export has been started
export const exportState = writable(ExportState.NOT_STARTED) // track the current state of the export
export const processedFile = writable(new Uint8Array) // track the current state of the export
export const processedFileSize = writable(0) // track the current state of the export

// Timeline
export const currentTimelineScale = writable(40); // default timeline scale (40 * 1px = 1 sec)
export const minTimelineScale = writable(0);
export const maxTimelineScale = writable(0);
export const currentPlaybackTime = writable(0); // current playback time in ms
export const currentThumbPosition = writable(0); // current thumb position in px
export const horizontalScroll = writable(0); // amount of px that the timeline is scrolled horizontally
export const verticalScroll = writable(0); // amount of px that the timeline is scrolled vertically
export const thumbOffset = writable(0);
export const maxPlaybackTime = writable(0); // max timeline time in ms
export const startAmountOfTicks = writable(0); // amount of timeline ruler ticks at the start
export const playbackIntervalId = writable(0); // store to hold the playback interval id
export const timelineTracks = writable<ITimelineTrack[]>([]) // array that holds all information about the elements on the timeline
export const isThumbBeingDragged = writable(false);
export const isTimelineElementBeingDragged = writable(false);
// TODO: remove old store variable
export const draggedElement = writable<ITimelineDraggedElement | null>(null); // contains information about the dragged timeline element
export const draggedElementPosition = writable<ITimelineDraggedElementPosition | null>(null) // keeps track of the dragged element position
export const draggedElementData = writable<ITimelineDraggedElementData | null>(null) // holds the dragged element information that will only be set once at the beginngin
export const selectedElement = writable(""); // keep track which element is currently selected in the timeline

// Workbench
export const availableMedia = writable<IMedia[]>([]);

// Preview
export const previewPlaying = writable(false);