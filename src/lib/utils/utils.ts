import { MediaType, type IMedia, type IFileMetadata } from "$lib/interfaces/Media";
import type { ITimelineElement, ITimelineTrack } from "$lib/interfaces/Timeline";
import { availableMedia, isTimelineElementBeingDragged, isThumbBeingDragged, timelineTracks, currentPlaybackTime, playbackIntervalId, currentTimelineScale, currentThumbPosition, thumbOffset, horizontalScroll } from "../../stores/store";
import { CONSTS } from "./consts";
import { adjustingInterval } from "./betterInterval";
import { get } from "svelte/store";
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../../../tailwind.config.js'

let interval: {
    start: () => void;
    stop: () => void;
}

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

// handle given media when it's drag and dropped into the timeline
export function handleTimelineMediaDrop(media: IMedia) {
    // console.log("handleTimelineMediaDrop -> media:", media)

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

    // console.log('handleTimelineMediaDrop -> tracks', timelineTrack);
    // timelineTracks.subscribe(value => console.log("handleTimelineMediaDrop -> timelineTracks:", value))
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

            // console.log('getFileInfo in onleadedmetadata -> duration:', duration, 'video:', video, "src:", video.src);
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
                // console.log('convertFileToDataUrl -> FileReader onload:', fr.result);
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

// set all "beingDragged" values in store to false 
export function resetAllBeingDragged() {
    isThumbBeingDragged.set(false)
    isTimelineElementBeingDragged.set(false)
}

// remove interval that handles the current playback time
export function pausePlayback() {
    console.log("pausePlayback")
    playbackIntervalId.update((id) => {
        // use current interval id to clear the interval
        clearInterval(id)
        // test.cancel()
        interval.stop()
        // set the store value back to zero
        return 0;
    })
}

// create interval that increases current playback time
export function resumePlayback() {
    // const startTime = new Date().valueOf();
    // TODO: remove old testing stuff
    const startTime = new Date().getTime();;
    console.time('Execution time');
    currentPlaybackTime.subscribe(el => console.log("playback interval -> currentPlaybackTime:", el))

    const intervallCallback = () => {
        // var diff = new Date().getTime() - startTime;
        // var drift = diff % 1000;
        // increase the current playback time in store by timeout amount
        currentPlaybackTime.update(value => value + CONSTS.playbackIntervalTimer)
        // console.log("interval drift:", (new Date().valueOf() - startTime) % 1000);
        // console.log("interval drift:", drift, "%");
        console.timeEnd('Execution time');
        console.time('Execution time');
        // console.log("interval drift:", (new Date().getTime() - startTime) % 1000);
    }

    const doError = () => {
        console.warn('The drift exceeded the interval.');
    };

    // ticker = AdjustingInterval(intervallCallback, CONSTS.playbackIntervalTimer, doError);
    interval = adjustingInterval(intervallCallback, CONSTS.playbackIntervalTimer, doError);
    interval.start()
    // const intervalId = setInterval(intervallCallback, CONSTS.playbackIntervalTimer)
    // test = accurateInterval(() => intervallCallback, CONSTS.playbackIntervalTimer)

    // write the interval id into store
    // playbackIntervalId.set(intervalId)
}

// convert the current thumb position (in px) to the playback time (in ms) using the current timeline scale
export function convertPxToPlaybackScale() {
    return Math.round((get(currentThumbPosition) / get(currentTimelineScale)) * 1000) || 0
}

// convert the current playback time (in ms) to the thumb position (in px) using the current timeline scale
export function convertPlaybackToPxScale() {
    return Math.round((get(currentPlaybackTime) / 1000) * get(currentTimelineScale))
}

// move the timeline thumb using a given mouse event
export function moveTimelineThumb(e: MouseEvent) {
    e.preventDefault();

    // only drag element if mouse is held down
    if (e.buttons === 1) {
        // calculate new position using the mouse position on the x axis, the left thumb offset and the amount scrolled horizontally
        const newPos = e.clientX - get(thumbOffset) + get(horizontalScroll);

        // avoid the thumb to be moved further left than the tracks
        if (newPos >= 0) {
            currentThumbPosition.set(newPos);

            // calculate playback time using the the new thumb position and write it into the store
            const playbackTime = convertPxToPlaybackScale();
            currentPlaybackTime.set(playbackTime);

            if (!get(isThumbBeingDragged)) {
                isThumbBeingDragged.set(true);
                console.log('isThumbBeingDragged?:', get(isThumbBeingDragged));
            }
        }
    }
}

// calculate if a given html element has a horizontal scrollbar
export function hasHorizontalScrollbar(el: HTMLElement) {
    return el.scrollWidth > el.clientWidth;
}

// calculate if a given html element has a vertical scrollbar
export function hasVerticalScrollbar(el: HTMLElement) {
    return el.scrollHeight > el.clientHeight;
}

// get all tailwind variables to use in components
export function getTailwindVariables() {
    return resolveConfig(tailwindConfig)
}

// get index of timeline element that matches the given id
export function getIndexOfId(arr: ITimelineTrack[], id: string) {
    for (var i = 0; i < arr.length; i++) {
        var index = arr[i].elements.findIndex(el => el.elementId === id);
        if (index > -1) {
            return [i, index];
        }
    }
}