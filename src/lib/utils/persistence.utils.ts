/**
 * This file includes everything for setting, updating, getting and clearing the current state in the localStorage
 */

import { get, type Writable } from "svelte/store";
import { availableMedia, currentTimelineScale, exportOverlayOpen, previewAspectRatio, restoreStateOverlayOpen, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";
import { get as getKeyVal, set as setKeyVal, clear } from 'idb-keyval';
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
export async function setupBackupInterval() {
    interval = setInterval(async () => {
        console.log("[BACKUP] in interval -> restoreStateOverlayOpen:", get(restoreStateOverlayOpen), " exportOverlayOpen:", get(exportOverlayOpen));

        // don't write current state into local storage in specific cases 
        if (get(restoreStateOverlayOpen) || get(exportOverlayOpen)) {
            return
        }

        // update storage
        await updateState()
    }, 10000)
}

// write current state into local storage
export async function updateState() {
    console.log("[BACKUP] updateState maop:", storeNamesMap);

    // get store value for each map element and write it into local storage using the map key
    for (const [key, value] of storeNamesMap.entries()) {
        const storeValue = get(value)
        console.log("[BACKUP] update in for each map -> key:", key, "value:", storeValue);
        await writeItem(key, storeValue)
    }
}

// get last saved state from local storage 
export async function getState() {
    // get storage value for each map element and print it to console
    for (const key of storeNamesMap.keys()) {
        const storageValue = await readItem(key)
        console.log("[BACKUP] get last saved state ->", key, ": ", storageValue);
    }
}

// restore last state from local storage and update the store variables 
export async function restoreLastState() {
    console.log("[BACKUP] restore map:", storeNamesMap);

    // get storage value for each map element and write it into the corresponding store
    for (const [key, value] of storeNamesMap.entries()) {
        const storageValue = await readItem(key)
        console.log("[BACKUP] restore state in for each ->", key, ": ", storageValue);

        if (storageValue !== undefined) {
            value.set(storageValue)
        }
    }
    await delay(2000)
    // hide dialog after everything has been restored 
    restoreStateOverlayOpen.set(false)
}

// check if a saved state is available in local storage
export async function isLastStateAvailableInStorage(): Promise<boolean> {
    // check if any value is undefined
    let noUndefinedValue = true
    for (const key of storeNamesMap.keys()) {
        console.log("[BACKUP] is last state available in for loop before");
        const storageValue = await readItem(key)
        console.log("[BACKUP] is last state available in for loop after ->", key, ": ", storageValue);

        if (storageValue === undefined) {
            noUndefinedValue = false
            break;
        }
    }
    return noUndefinedValue
}

// writes given data into indexedDB using given key
export function writeItem(key: string, data: any): void {
    console.log("[BACKUP] write item -> key:", key, "data:", data);
    setKeyVal(key, data)
        .catch((err) => console.error(`[BACKUP] error "${err}" while setting key "${key}" to value "${data}"`));
}

// reads data from indexedDB using given key
export async function readItem(key: string): Promise<any> {
    const value = await getKeyVal(key)

    return value
}

export function clearStorage(): void {
    console.log("[BACKUP] clear storage");
    clear()
}