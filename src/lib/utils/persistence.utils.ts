/**
 * This file includes everything for setting, updating, getting and clearing the current state in the localStorage
 */

import { get, type Writable } from "svelte/store";
import { availableMedia, timelineTracks } from "../../stores/store";

// TODO: create function to run in regular intervals in the background that saves the current state from the stores into the localStorage -> do it async if possible to not block the ui on every update
// on page load we check if a value for the key is given in localStorage and then use it, if not we don't

let interval
const tracksStorageKey = "tracks"
const mediaStorageKey = "media"

// map of each store value that is being saved in local storage with their corresponding key
const storeNamesMap = new Map<string, Writable<unknown>>(
    [
        [tracksStorageKey, timelineTracks],
        [mediaStorageKey, availableMedia]
    ]
)

// setup intervals when to update the local backup
export function setupBackupInterval() {
    let i = 0
    interval = setInterval(() => {
        console.log("[BACKUP] in interval:", i);
        // writeItem(backupKey, get(timelineTracks))
        i += 1
    }, 2000)
}

// write current state into local storage
export function updateState() {
    console.log("[BACKUP] update backup");

    // get store value from each map element and write it into local storage using the map key
    storeNamesMap.forEach((value, key) => {
        console.log("[BACKUP] update in for each map -> key:", key, "value:", get(value));
        writeItem(key, get(value))
    })
}

// get last saved state from local storage 
export function getState() {
    const state = readItem(tracksStorageKey)
    console.log("[BACKUP] get backup ->", state);
}

// restore last state from local storage and update the store variables 
export function restoreLastState() {
    // const state = readItem(tracksStorageKey)

    // get storage value from each map element and write it into the corresponsing stores
    storeNamesMap.forEach((value, key) => {
        const storageValue = readItem(key)
        console.log("[BACKUP] restore state in for each ->", storageValue);

        // only write value into store if we got a value from local storage
        if (storageValue !== null) {
            value.set(storageValue)
        }
    })
}

// writes given data into local storage using given key
export function writeItem(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// reads data from local storage using given key
export function readItem(key: string): any | null {
    const data = localStorage.getItem(key);

    return data ? JSON.parse(data) : null
}

export function clear(): void {
    console.log("[BACKUP] clear storage");
    localStorage.clear()
}