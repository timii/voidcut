import { availableMedia } from "../../stores/store";

// save a given FileList of files into the store 
export function saveFilesToStore(files: FileList) {
    // convert FileList type to an array
    let filesArr = [...files];

    // save dropped file(s) into store
    availableMedia.update((arr) => [...arr, ...filesArr]);

    console.log('saveFilesToStore -> files', files);
    // availableMedia.subscribe(value => console.log("saveFilesToStore -> availableMedia:", value))
}

// handle given files when media is manually uploaded or drag and dropped
export async function handleMediaUpload(files: FileList) {
    const videoMetadata = await getFileMetadata(files);
    console.log('onMediaUpload -> videoMetadata:', videoMetadata);
    saveFilesToStore(files);
}

// get metadata from given FileList
function getFileMetadata(files: FileList) {
    return new Promise((resolve, reject) => {
        // convert FileList type to an array
        let filesArr = [...files];

        // create video element to "hold" each file and only preload its metadata
        var video = document.createElement('video');
        video.preload = 'metadata';

        // create blob out of file and pass it as a source to the video element
        video.src = URL.createObjectURL(filesArr[0]);

        // add event listener to when metadata has loaded
        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            var duration = video.duration;
            console.log('getFileInfo in onleadedmetadata -> duration:', duration, 'video:', video);
            resolve(duration);
        };

        // console.log('getFileInfo after onleadedmetadata -> video:', video);
    });
}