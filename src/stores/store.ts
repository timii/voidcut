import { writable } from 'svelte/store';

export const currentPlaybackTime = writable(0);
export const availableMedia = writable<File[]>([]);