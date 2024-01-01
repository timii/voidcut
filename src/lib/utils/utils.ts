import { MediaType, type IMedia, type IFileMetadata } from "$lib/interfaces/Media";
import type { ITimelineElement, ITimelineTrack } from "$lib/interfaces/Timeline";
import { availableMedia, timelineTracks } from "../../stores/store";

// save a given array of media objects into the store 
export function saveFilesToStore(files: IMedia[]) {
    // add given array of file(s) into store
    availableMedia.update((arr) => [...arr, ...files]);

    console.log('saveFilesToStore -> files', files);
    // availableMedia.subscribe(value => console.log("saveFilesToStore -> availableMedia:", value))
}

// handle given files when media is manually uploaded or drag and dropped
export async function handleFileUpload(files: FileList) {

    // convert FileList type to an array of files
    const filesArr = [...files];

    // add metadata to each file
    const mediaArr: IMedia[] = await Promise.all(filesArr.map(async (file) => {

        // get metadata of current file
        const fileMetadata = await getFileMetadata(file);

        console.log("utils -> in filesArr map file:", file)
        return {
            name: file.name,
            mediaId: generateId(),
            type: MediaType.Video,
            loaded: true,
            ...fileMetadata
        }
    }))

    console.log('handleFileUpload -> mediaArr after map:', mediaArr);
    saveFilesToStore(mediaArr);
}

export function handleTimelineMediaDrop(media: IMedia) {
    console.log("handleTimelineMediaDrop -> media:", media)

    // convert media type to timeline element type
    const timelineEl: ITimelineElement = {
        duration: media.duration ? media.duration : 3000,
        mediaId: media.mediaId,
        type: media.type,
        elementId: generateId(),
        playbackStartTime: 0,
        trimFromStart: 0,
        trimFromEnd: 0,
        videoOptions: {}
    }

    // create a new track and add the new element into it
    const timelineTrack: ITimelineTrack = {
        trackId: generateId(),
        elements: [timelineEl]
    }

    // add new object into timeline tracks
    timelineTracks.update(arr => [...arr, timelineTrack])
}

// get metadata from a given file 
function getFileMetadata(file: File): Promise<IFileMetadata> {
    return new Promise((resolve) => {
        // convert FileList type to an array
        // let filesArr = [...file];

        // create video element to "hold" each file and only preload its metadata
        var video = document.createElement('video');
        video.preload = 'metadata';

        // create blob out of file and pass it as a source to the video element
        video.src = URL.createObjectURL(file);

        // add event listener to when metadata has loaded
        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            var duration = video.duration;
            console.log('getFileInfo in onleadedmetadata -> duration:', duration, 'video:', video);
            resolve({
                duration
            });
        };

        // console.log('getFileInfo after onleadedmetadata -> video:', video);
    });
}

// generate a unique id
function generateId() {
    return crypto.randomUUID() as string
}