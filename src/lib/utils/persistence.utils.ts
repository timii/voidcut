/**
 * This file is the abstract layer between the worker functions and components or files using the persistence utils
 */

import { get, type Writable } from "svelte/store";
import { availableMedia, currentTimelineScale, exportOverlayOpen, lastSaveTime, previewAspectRatio, restoreStateOverlayOpen, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";
import { readItem, updateItem, writeItem, readManyItems, clearItems } from "./persistence.worker.js";

let interval

// map of each store value that is being saved in local storage with their corresponding key
const storeNamesMap = new Map<string, Writable<unknown>>(
    [
        [CONSTS.tracksStorageKey, timelineTracks],
        [CONSTS.mediaStorageKey, availableMedia],
        [CONSTS.timelineScaleStorageKey, currentTimelineScale],
        [CONSTS.previewAspectRatioStorageKey, previewAspectRatio],
        [CONSTS.lastSaveStorageKey, lastSaveTime],
    ]
)

// initialize the persistence webworker
export async function initPersistenceWorker() {
    console.log("[BACKUP] init worker");
    // create the worker and properly resolve worker in a production build for vite. This ensures that the correct path is used after the build
    new Worker(new URL('./persistence.worker.js', import.meta.url), { type: 'module' });
}

// setup interval when to update the last state in storage 
export async function setupBackupInterval() {
    interval = setInterval(async () => {
        console.log("[BACKUP] in interval -> restoreStateOverlayOpen:", get(restoreStateOverlayOpen), " exportOverlayOpen:", get(exportOverlayOpen));

        // don't write current state into local storage in specific cases 
        if (get(restoreStateOverlayOpen) || get(exportOverlayOpen)) {
            return
        }

        const d = new Date()
        // update time for last save with current time
        // do it before updating the state to also persist the newest time and date value in storage
        lastSaveTime.set(d.toLocaleString())

        // update storage with current store values
        await updateState()

    }, 10000)
}

// write current state into local storage
export async function updateState() {
    console.log("[BACKUP] updateState map:", storeNamesMap);

    // get store value for each map element and write it into local storage using the map key
    for (const [key, value] of storeNamesMap.entries()) {
        const storeValue = get(value)
        console.log("[BACKUP] update in for each map -> key:", key, "value:", storeValue);

        // read value from current key
        const valueExist = await readItem(key);

        // if key/value exists update it
        if (valueExist !== undefined) {
            await updateItem(key, storeValue)
        }
        // else add the new key 
        else {
            await writeItem(key, storeValue)
        }

    }
}

// get last saved state from storage and log it into console
export async function getState() {
    const storageValues = await readManyItems([...storeNamesMap.keys()])
    console.log("[BACKUP] get last saved state:", storageValues);
}

// restore last state from local storage and update the store variables 
export async function restoreLastState() {
    console.log("[BACKUP] restore map:", storeNamesMap);

    // get all storage values
    const storageValues = await readManyItems([...storeNamesMap.keys()])

    console.log("[BACKUP] storage values:", storageValues)

    // write storage value into corresponding store
    Array.from(storeNamesMap.values()).forEach((store: Writable<unknown>, i: number) => {
        if (storageValues !== undefined) {
            store.set(storageValues[i])
        }
    });

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

export async function clearStorage() {
    await clearItems()
}