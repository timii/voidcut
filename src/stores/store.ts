import type { IMedia } from '$lib/interfaces/Media';
import { writable } from 'svelte/store';

// Timeline
export const currentTimelineScale = writable(0);
export const minTimeineScale = writable(0);
export const maxTimelineScale = writable(0);
export const currentPlaybackTime = writable(0);
export const maxPlaybackTime = writable(30000); // default max timeline time

// Workbench
export const availableMedia = writable<IMedia[]>([]);