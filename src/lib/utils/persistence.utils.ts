/**
 * This file includes everything for setting, updating, getting and clearing the current state in the localStorage
 */

import { get, type Writable } from "svelte/store";
import { availableMedia, currentTimelineScale, exportOverlayOpen, previewAspectRatio, restoreStateOverlayOpen, timelineTracks } from "../../stores/store";
import { CONSTS } from "./consts";
import { get as getKeyVal, set as setKeyVal, clear, update, getMany } from 'idb-keyval';

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

        // read value from current key
        const valueExist = await getKeyVal(key);

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
    const storageValues = await getMany([...storeNamesMap.keys()])
    console.log("[BACKUP] get last saved state:", storageValues);
}

// restore last state from local storage and update the store variables 
export async function restoreLastState() {
    console.log("[BACKUP] restore map:", storeNamesMap);

    // get all storage values
    const storageValues = await getMany([...storeNamesMap.keys()])

    console.log("[BACKUP] storage values:", storageValues)

    // write storage value into corresponding store
    storeNamesMap.values().forEach((store, i) => {
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

// writes given data into indexedDB using given key
export async function writeItem(key: string, data: any): Promise<void> {
    // console.log("[BACKUP] write item -> key:", key, "data:", data);
    setKeyVal(key, data)
        .catch((err) => console.error(`[BACKUP] error "${err}" while setting key "${key}" to value "${data}"`));
}

// update indexedDB value of given key with given data
export async function updateItem(key: string, data: any): Promise<void> {
    update(key, (_) => data);
}

// reads data from indexedDB using given key
export async function readItem(key: string): Promise<any> {
    return await getKeyVal(key)
}



export function clearStorage(): void {
    console.log("[BACKUP] clear storage");
    clear()
}