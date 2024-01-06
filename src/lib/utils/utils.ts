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
        const fileMetadata = await getFileMetadata(file)

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

    console.log('handleTimelineMediaDrop -> tracks', timelineTrack);
    timelineTracks.subscribe(value => console.log("handleTimelineMediaDrop -> timelineTracks:", value))
}

// get metadata from a given file 
function getFileMetadata(file: File): Promise<IFileMetadata> {
    return new Promise(async (resolve, reject) => {
        // convert FileList type to an array
        // let filesArr = [...file];

        // create video element to "hold" each file and only preload its metadata
        var video = document.createElement('video');
        video.preload = 'metadata';

        // create blob out of file and pass it as a source to the video element
        video.src = await convertFileToDataUrl(file)
        // video.src = URL.createObjectURL(file);

        // add event listener to when metadata has loaded
        video.onloadedmetadata = () => {
            // window.URL.revokeObjectURL(video.src);
            const duration = video.duration;

            // calculate the duration in milliseconds and round it to the nearest integer  
            const durationInMs = Math.round(duration * 1000)

            console.log('getFileInfo in onleadedmetadata -> duration:', duration, 'video:', video, "src:", video.src);
            resolve({
                src: video.src,
                duration: durationInMs
            });
        };

        // add event listener to when loading video throws an error
        video.onerror = (err) => {
            console.error("Error while getting file metadata", err)
            reject(err)
        }

        // console.log('getFileInfo after onleadedmetadata -> video:', video);
    });
}

// convert a given file into a data url string
function convertFileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (FileReader) {
            let fr = new FileReader();

            // read file content as a dataUrl
            fr.readAsDataURL(file);

            // add eventlistener to when the FileReader finished loading
            fr.onloadend = () => {
                console.log('convertFileToDataUrl -> FileReader onload:', fr.result);
                resolve(fr.result as string)
                // testImage = fr.result as any;
                // var source = document.createElement('source');
                // source.setAttribute('src', fr.result as string);
                // source.setAttribute('type', 'video/mp4');
                // testVideo.appendChild(source);
            };

            // add eventlistener to when the FileReader throws an error
            fr.onerror = (err) => {
                console.error("Error while converting File to DataUrl", err)
                reject(err)
            }
        }
    })
}

// generate a unique id
function generateId() {
    return crypto.randomUUID() as string
}