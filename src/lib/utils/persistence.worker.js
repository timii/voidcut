/**
 * Handles writing, reading and updating the storage in the background
 */

import { get, set, clear, update, getMany } from 'idb-keyval';

/**
 * set value from given key to given data
 * @param {string} key the key that should be set
 * @param {any} data the data to write as the value
 * @return {Promise<void>} the empty promise when setting value is done
 */
export async function writeItem(key, data) {
    // console.log("[BACKUP] write item -> key:", key, "data:", data);
    set(key, data)
        .catch((err) => console.error(`[BACKUP] error "${err}" while setting key "${key}" to value "${data}"`));
}

/**
 * update value from given key with given data
 * @param {string} key the key for which to update the value
 * @param {any} data the data to write as the value
 * @return {Promise<void>} the empty promise when updating value is done
 */
export async function updateItem(key, data) {
    update(key, (_) => data);
}

/**
 * get value from given key
 * @param {string} key the key to get the value from
 * @return {Promise<any>} the value of the given key
 */
export async function readItem(key) {
    return await get(key)
}

/**
 * get value from given array of keys
 * @param {string[]} keys the keys to get the value from
 * @return {Promise<any>} the value of the given key
 */
export async function readManyItems(keys) {
    return await getMany(keys)
}

/**
 * clear storage
 * @return {Promise<void>} the empty promise after clearing storage is done
 */
export async function clearItems() {
    console.log("[BACKUP] clear items");
    await clear()
}