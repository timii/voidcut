import { availableMedia } from "../../stores/store";

export function saveFilesToStore(files: FileList) {
    // convert FileList type to an array
    let filesArr = [...files];

    // save dropped file(s) into store
    availableMedia.update((arr) => [...arr, ...filesArr]);

    console.log('saveFilesToStore -> files', files);
    availableMedia.subscribe(value => console.log("saveFilesToStore -> availableMedia:", value))
}