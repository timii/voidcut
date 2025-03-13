/**
 * This file includes everything for setting, updating, getting and clearing the current state in the localStorage
 */

import { get } from "svelte/store";
import { timelineTracks } from "../../stores/store";

let interval

// setup intervals when to update the local backup
export function setupBackupInterval() {
    let i = 0
    interval = setInterval(() => {
        console.log("[BACKUP] in interval:", i);
        // writeItem("test", get(timelineTracks))
        i += 1
    }, 2000)
}

// updates state in local storage if called
export function updateBackup() {
    console.log("[BACKUP] update backup");
    writeItem("test", get(timelineTracks))

}

// writes given data (stringified) into local storage using given key
export function writeItem(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
}

// reads data from local storage using given key
export function readItem(key: string): any | null {
    const data = localStorage.getItem(key);

    return data ? JSON.parse(data) : null
}