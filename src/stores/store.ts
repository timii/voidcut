import type { IMedia } from '$lib/interfaces/Media';
import type { ITimelineDraggedElement, ITimelineTrack } from '$lib/interfaces/Timeline';
import { writable } from 'svelte/store';

// General
export const windowWidth = writable(0) // current window width in ms

// Timeline
export const currentTimelineScale = writable(40); // default timeline scale (40 * 1px = 1 sec)
export const minTimeineScale = writable(0);
export const maxTimelineScale = writable(0);
export const currentPlaybackTime = writable(0); // current playback time in ms
export const currentThumbPosition = writable(0); // current thumb position in px
export const horizontalScroll = writable(0); // amount of px that the timeline is scrolled horizontally
export const verticalScroll = writable(0); // amount of px that the timeline is scrolled vertically
export const thumbOffset = writable(0);
export const maxPlaybackTime = writable(0); // max timeline time in ms
export const startAmountOfTicks = writable(0); // amount of timeline ruler ticks at the start
export const playbackIntervalId = writable(0); // store to hold the playback interval id
export const timelineTracks = writable<ITimelineTrack[]>([])
export const isThumbBeingDragged = writable(false);
export const isTimelineElementBeingDragged = writable(false);
export const draggedElement = writable<ITimelineDraggedElement | null>(null); // contains information about the dragged timeline element
export const selectedElement = writable(""); // keep track which element is currently selected in the timeline

// Workbench
export const availableMedia = writable<IMedia[]>([]);

// Preview
export const previewPlaying = writable(false);