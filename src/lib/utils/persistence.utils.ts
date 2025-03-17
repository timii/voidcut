/**
 * This file includes everything for setting, updating, getting and clearing the current state in the localStorage
 */

import { get, type Writable } from "svelte/store";
import { availableMedia, currentTimelineScale, exportOverlayOpen, previewAspectRatio, restoreStateOverlayOpen, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";
import { delay } from "./utils";

let interval

// map of each store value that is being saved in local storage with their corresponding key
const storeNamesMap = new Map<string, Writable<unknown>>(
    [
        [CONSTS.tracksStorageKey, timelineTracks],
        [CONSTS.mediaStorageKey, availableMedia],
        [CONSTS.timelineScaleStorageKey, currentTimelineScale],
        [CONSTS.previewAspectRatioStorageKey, previewAspectRatio],
    ]
)

// setup interval when to update the last state in storage 
export function setupBackupInterval() {
    interval = setInterval(() => {
        console.log("[BACKUP] in interval");

        // don't write current state into local storage in specific cases 
        if (get(restoreStateOverlayOpen) || get(exportOverlayOpen)) {
            return
        }

        // update each storage value
        storeNamesMap.forEach((value, key) => {
            console.log("[BACKUP] update in interval -> key:", key, "value:", get(value));
            writeItem(key, get(value))
        })
    }, 10000)
}

// write current state into local storage
export function updateState() {
    // get store value for each map element and write it into local storage using the map key
    storeNamesMap.forEach((value, key) => {
        console.log("[BACKUP] update in for each map -> key:", key, "value:", get(value));
        writeItem(key, get(value))
    })
}

// get last saved state from local storage 
export function getState() {
    // get storage value for each map element and print it to console
    storeNamesMap.forEach((_, key) => {
        const storageValue = readItem(key)
        console.log("[BACKUP] get last saved state ->", key, ": ", storageValue);
    })
}

// restore last state from local storage and update the store variables 
export async function restoreLastState() {

    // get storage value for each map element and write it into the corresponsing stores
    storeNamesMap.forEach((value, key) => {
        const storageValue = readItem(key)
        console.log("[BACKUP] restore state in for each ->", key, ": ", storageValue);

        // only write value into store if we got a value from local storage
        if (storageValue !== null) {
            value.set(storageValue)
        }
    })

    await delay(5000)

    // hide dialog after everything has been restored 
    restoreStateOverlayOpen.set(false)
}

// check if a saved state is available in local storage
export function lastStateAvailable(): boolean {
    // check if every key is given in local storage
    return Array.from(storeNamesMap.keys()).every((key) => {
        const storageValue = readItem(key)
        console.log("[BACKUP] lastStateAvailable ->", key, ": ", storageValue);

        // only return false if the storage value is null
        return storageValue !== null
    })
}

// writes given data into local storage using given key
export function writeItem(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// reads data from local storage using given key
export function readItem(key: string): unknown | null {
    const data = localStorage.getItem(key);

    return data ? JSON.parse(data) : null
}

export function clear(): void {
    console.log("[BACKUP] clear storage");
    localStorage.clear()
}