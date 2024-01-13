import type { IMedia } from '$lib/interfaces/Media';
import type { ITimelineTrack } from '$lib/interfaces/Timeline';
import { writable } from 'svelte/store';

// Timeline
export const currentTimelineScale = writable(0);
export const minTimeineScale = writable(0);
export const maxTimelineScale = writable(0);
export const currentPlaybackTime = writable(0);
export const currentThumbPosition = writable(0);
export const thumbOffset = writable(0);
export const maxPlaybackTime = writable(30000); // default max timeline time
export const timelineTracks = writable<ITimelineTrack[]>([])
export const isThumbBeingDragged = writable(false);
export const isTimelineElementBeingDragged = writable(false);

// Workbench
export const availableMedia = writable<IMedia[]>([]);