import { ExportState } from '$lib/interfaces/Ffmpeg';
import type { IMedia } from '$lib/interfaces/Media';
import { PreviewAspectRatio } from '$lib/interfaces/Player';
import type { ITimelineDraggedElementHover, ISelectedElement, ITimelineDraggedElement, ITimelineDraggedElementData, ITimelineDraggedElementPosition, ITimelineElementResizeData, ITimelineTrack } from '$lib/interfaces/Timeline';
import { CONSTS } from '$lib/utils/consts';
import { writable } from 'svelte/store';

// General
export const windowWidth = writable(0) // current window width in ms
export const windowHeight = writable(0) // current window height px
export const aboutOverlayOpen = writable(false)

// Persistence
export const restoreStateOverlayOpen = writable(false)
export const lastSaveTime = writable("") // the date and time of last save

// Ffmpeg
export const ffmpegLoaded = writable(false)
export const exportOverlayOpen = writable(false)
export const ffmpegProgress = writable(0) // track the progress of ffmpeg in percent
export const ffmpegProgressPrevValue = writable(0) // track the previous value for progress of ffmpeg
export const ffmpegProgressElapsedTime = writable(0) // track the elapsed time since the export has been started
export const exportState = writable(ExportState.NOT_STARTED) // track the current state of the export
export const processedFile = writable<Uint8Array>() // track the current state of the export
export const processedFileSize = writable(0) // track the current state of the export

// Timeline
export const currentTimelineScale = writable(CONSTS.timelineStartingScale); // default timeline scale (40 * 1px = 1 sec)
export const minTimelineScale = writable(1.25); // min timeline scale (1.5px = 1s)
export const maxTimelineScale = writable(320); // max timeline scale (320px = 1s)
export const possibleScaleValues = writable<number[]>([]); // list of possible scale values
export const scaleFitToScreen = writable(false); // keep track if scale has been fit to the screen width
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
export const isTimelineElementBeingDragged = writable(false); // keep track if a timeline element is being dragged
export const isTimelineElementBeingResized = writable(false); // keep track if a timeline element is being resized
export const elementResizeData = writable<ITimelineElementResizeData | undefined>(undefined); // keep track of what side the element is being resized
// TODO: remove old store variable
export const draggedElement = writable<ITimelineDraggedElement | null>(null); // contains information about the dragged timeline element
export const draggedElementPosition = writable<ITimelineDraggedElementPosition | null>(null) // keeps track of the dragged element position
export const draggedElementHover = writable<ITimelineDraggedElementHover | null>(null) // keeps track of what element the dragged element is hovered over
export const draggedOverThreshold = writable<boolean>(false) // keeps track if the element has been dragged more than the threshold
export const draggedOverFirstDivider = writable<boolean>(false) // keeps track if the dragged element is under the last element
export const draggedUnderLastDivider = writable<boolean>(false) // keeps track if the dragged element is under the last element
export const draggedElementData = writable<ITimelineDraggedElementData | null>(null) // holds the dragged element information that will only be set once at the beginngin
export const selectedElement = writable<ISelectedElement>({ elementId: '' }); // keep track which element is currently selected in the timeline

// Workbench
export const availableMedia = writable<IMedia[]>([]);

// Preview
export const previewPlaying = writable(false);
export const previewAspectRatio = writable(PreviewAspectRatio.E16_9); // keeps track of the aspect ratio used for the preview