import { MediaType, type IMedia, type IFileMetadata } from "$lib/interfaces/Media";
import type { ITimelineDraggedElement, ITimelineElement, ITimelineElementBounds, ITimelineTrack } from "$lib/interfaces/Timeline";
import { availableMedia, isTimelineElementBeingDragged, isThumbBeingDragged, timelineTracks, currentPlaybackTime, playbackIntervalId, currentTimelineScale, currentThumbPosition, thumbOffset, horizontalScroll, selectedElement, draggedElement, previewPlaying } from "../../stores/store";
import { CONSTS } from "./consts";
import { adjustingInterval } from "./betterInterval";
import { get } from "svelte/store";
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../../../tailwind.config.js'
import { generateAudioWaveform } from "./ffmpeg.utils";

let interval: {
    start: () => void;
    stop: () => void;
}
let timelineScrollContainer: Element | null

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
        console.log("utils -> in filesArr map file type:", file, file.type)

        // get the file type prefix
        const fileTypeString = file.type.split('/')[0].toUpperCase()

        // convert the string into an enum value
        // const fileType: MediaType = MediaType[fileTypeString as keyof typeof MediaType]
        const fileType = fileTypeString as MediaType
        console.log("utils -> in filesArr map file type after convert:", fileType, fileTypeString)

        let fileMetadata: IFileMetadata = {} as IFileMetadata
        let filePreviewImage: string = '';
        // TODO: handle different file types 
        switch (fileType) {
            case MediaType.Audio:
                console.log("in switch audio file type")

                // get metadata for the audio file
                fileMetadata = await getFileMetadata(file, MediaType.Audio)

                // TODO: generate preview image for audio files

                const generatedImage = await generateAudioWaveform(file)
                if (generatedImage) {
                    filePreviewImage = generatedImage
                }
                break;
            case MediaType.Image:
                console.log("in switch image file type")

                // convert uploaded file into dataUrl
                const fileAsDataUrl = await convertFileToDataUrl(file)
                fileMetadata = { src: fileAsDataUrl }

                filePreviewImage = fileAsDataUrl

                break;
            case MediaType.Video:
                console.log("in switch video file type")

                // get metadata of current file
                fileMetadata = await getFileMetadata(file, MediaType.Video)

                // create image of uploaded media to show as preview
                filePreviewImage = await getFilePreviewImage(file)
                break;
            default:
                console.error("No fitting media type found")
        }



        console.log("utils -> in filesArr map file:", file, "previewImage:", filePreviewImage, "metadata:", fileMetadata)
        return {
            name: file.name,
            mediaId: generateId(),
            type: fileType,
            // TODO: implement loading so that the element gets directly added into store but with loaded false only and then we update it here
            loaded: true,
            previewImage: filePreviewImage,
            ...fileMetadata
        }
    }))

    console.log('handleFileUpload -> mediaArr after map:', mediaArr);
    saveFilesToStore(mediaArr);
}

// handle given media when it's drag and dropped into the timeline
export function handleTimelineMediaDrop(media: IMedia, rowIndex?: number, elIndex?: number, startTime?: number) {
    // console.log("handleTimelineMediaDrop -> media:", media)

    // convert media type to timeline element type
    const timelineEl: ITimelineElement = {
        duration: media.duration ? media.duration : 3000,
        mediaId: media.mediaId,
        type: media.type,
        elementId: generateId(),
        playbackStartTime: startTime ? startTime : 0,
        // playbackStartTime: 4000, // TODO: remove only for testing
        trimFromStart: 0,
        trimFromEnd: 0,
        videoOptions: {}
    }

    // const tracksCopy = get(timelineTracks)
    // if there already exists a track add it to the track
    // if (tracksCopy.length >= 1) {
    //     tracksCopy[0].elements.push(timelineEl)
    //     timelineTracks.set(tracksCopy)

    // } else {

    // create a new track and add the new element into it
    // const timelineTrack: ITimelineTrack = {
    //     trackId: generateId(),
    //     elements: [timelineEl]
    // }
    const timelineTrack = createTrackWithElement(timelineEl)

    console.log("handleTimelineMediaDrop -> index:", elIndex)
    // TODO: refactor this whole if else
    if (elIndex === undefined) {
        if (rowIndex !== undefined) {
            // add new track object at given row index
            timelineTracks.update(arr => arr.toSpliced(rowIndex, 0, timelineTrack))
        } else {
            // append new track object into timeline tracks
            timelineTracks.update(arr => [...arr, timelineTrack])
        }
    } else {
        // add new timeline element into given row index
        timelineTracks.update(arr => {
            // TODO: remove test
            // const test = [...arr]
            // console.log("handleTimelineMediaDrop -> add at given index:", test.toSpliced(elIndex, 0, timelineTrack))
            const trackIndex = rowIndex !== undefined && rowIndex >= 0 ? rowIndex : 0
            arr[trackIndex].elements.splice(elIndex, 0, timelineEl)
            return arr
            // return arr.toSpliced(elIndex, 0, timelineTrack)

        })
    }
    // }

    // console.log('handleTimelineMediaDrop -> tracks', timelineTrack);
    // timelineTracks.subscribe(value => console.log("handleTimelineMediaDrop -> timelineTracks:", value))
}

export function createTrackWithElement(element: ITimelineElement) {
    return {
        trackId: generateId(),
        elements: [element]
    } as ITimelineTrack
}

// creates a preview image using a given file
// TODO: handle different media types differently: video(thumbnail), image(image), audio(soundwave of the file)
function getFilePreviewImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const video = document.createElement("video");

        video.src = URL.createObjectURL(file);

        video.onloadeddata = () => {
            let ctx = canvas.getContext("2d");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            if (!ctx) {
                reject()
                return;
            }

            ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            video.pause();
            URL.revokeObjectURL(video.src)
            return resolve(canvas.toDataURL("image/png"));
        };
    })
}

// get metadata from a given file 
function getFileMetadata(file: File, type: MediaType.Video | MediaType.Audio): Promise<IFileMetadata> {
    return new Promise(async (resolve, reject) => {
        // convert FileList type to an array
        // let filesArr = [...file];

        // TODO: implement case for other file type like images or audio
        // create video element to "hold" each file and only preload its metadata
        let placeholderEl: HTMLVideoElement | HTMLAudioElement
        if (type === MediaType.Video) {
            placeholderEl = document.createElement('video') as HTMLVideoElement;
        } else {
            placeholderEl = document.createElement('audio') as HTMLAudioElement
        }
        placeholderEl.preload = 'metadata';

        // create blob out of file and pass it as a source to the video element
        placeholderEl.src = await convertFileToDataUrl(file)
        // video.src = URL.createObjectURL(file);

        // add event listener to when metadata has loaded
        placeholderEl.onloadedmetadata = () => {
            const duration = placeholderEl.duration;

            // calculate the duration in milliseconds and round it to the nearest integer  
            const durationInMs = Math.round(duration * CONSTS.secondsMultiplier)

            window.URL.revokeObjectURL(placeholderEl.src);
            // console.log('getFileInfo in onleadedmetadata -> duration:', duration, 'video:', video, "src:", video.src);
            resolve({
                src: placeholderEl.src,
                duration: durationInMs
            });
        };

        // add event listener to when loading video throws an error
        placeholderEl.onerror = (err) => {
            reject(err)
        }
    });
}

// convert a given file into a data url string
export function convertFileToDataUrl(file: File): Promise<string> {
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

// source: https://gist.github.com/borismus/1032746
// convert a base64 string into a binary UInt8Array
export function convertDataUrlToUIntArray(dataUrl: string) {
    const BASE64_MARKER = ';base64,';
    const base64Index = dataUrl.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const base64 = dataUrl.substring(base64Index);
    const raw = window.atob(base64);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

// generate a unique id
function generateId() {
    return crypto.randomUUID() as string
}

// set all "beingDragged" values in store to false 
export function resetAllBeingDragged() {
    isThumbBeingDragged.set(false)
    isTimelineElementBeingDragged.set(false)
    draggedElement.set(null)
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
    previewPlaying.set(false)
}

// create interval that increases current playback time
export function resumePlayback() {
    // const startTime = new Date().valueOf();
    // TODO: remove old testing stuff
    const startTime = new Date().getTime();;
    // console.time('Execution time');
    // currentPlaybackTime.subscribe(el => console.log("playback interval -> currentPlaybackTime:", el))

    // TODO: only update current playback time if current playback time is less or equal to max playback time
    const intervallCallback = () => {
        // var diff = new Date().getTime() - startTime;
        // var drift = diff % 1000;
        // increase the current playback time in store by timeout amount
        currentPlaybackTime.update(value => value + CONSTS.playbackIntervalTimer)
        // console.log("interval drift:", (new Date().valueOf() - startTime) % 1000);
        // console.log("interval drift:", drift, "%");
        // console.timeEnd('Execution time');
        // console.time('Execution time');
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

// TODO: make both functions more generic instead of always using the thumb position and instead use a number that can be passe via parameters
// convert the current thumb position (in px) to the playback time (in ms) using the current timeline scale
export function convertPxToPlaybackScale() {
    return Math.round((get(currentThumbPosition) / get(currentTimelineScale)) * CONSTS.secondsMultiplier) || 0
}

// convert the current playback time (in ms) to the thumb position (in px) using the current timeline scale
export function convertPlaybackToPxScale() {
    return Math.round((get(currentPlaybackTime) / CONSTS.secondsMultiplier) * get(currentTimelineScale))
}

// move the timeline thumb using a given mouse event
export function moveTimelineThumb(e: MouseEvent) {
    e.preventDefault();

    const clickOriginOverElement = (e.target as HTMLElement).classList.contains('timeline-row-element')
    const originNotOverElOrThumbAlreadyMoving = !clickOriginOverElement || get(isThumbBeingDragged)
    const onlyPrimaryButtonClicked = e.buttons === 1

    const moveThumb = onlyPrimaryButtonClicked && !get(isTimelineElementBeingDragged) && originNotOverElOrThumbAlreadyMoving

    // check if we should move the thumb or if something else is already being dragged
    if (!moveThumb) {
        return
    }

    const thumbBoundingRect = document.getElementById('timeline-thumb')?.getBoundingClientRect()
    if (!thumbBoundingRect) {
        return
    }

    if (!timelineScrollContainer) {
        timelineScrollContainer = document.getElementById('timeline-scroll-container')
    }

    // if the thumb is at the left or right edge of the screen (with some buffers) scroll the timeline horizontally
    // left edge
    // TODO: implement scrolling to the right
    if (thumbBoundingRect.x < 16) {
        requestAnimationFrame(() => {
            // timelineScrollContainer?.scrollBy(-1, 0)
        })
        // timelineScrollContainer?.scrollBy(-1, 0)
    }

    // calculate new position using the mouse position on the x axis, the left thumb offset and the amount scrolled horizontally
    const newPos = e.clientX - get(thumbOffset) + get(horizontalScroll);

    // avoid the thumb to be moved further left than the tracks
    if (newPos < 0) {
        return
    }

    currentThumbPosition.set(newPos);
    // calculate playback time using the the new thumb position and write it into the store
    const playbackTime = convertPxToPlaybackScale();
    currentPlaybackTime.set(playbackTime);

    if (!get(isThumbBeingDragged)) {
        // console.log('isThumbBeingDragged?:', JSON.parse(JSON.stringify(get(isThumbBeingDragged))));
        isThumbBeingDragged.set(true);
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
export function getIndexOfElementInTracks() {
    const tracks = get(timelineTracks)
    const selectedElementId = get(selectedElement)
    for (let i = 0; i < tracks.length; i++) {
        let index = tracks[i].elements.findIndex(el => el.elementId === selectedElementId);
        if (index > -1) {
            return [i, index];
        }
    }
}

// get relative mouse coordinates to the given element DOMRect
export function getRelativeMousePosition(e: MouseEvent, el: DOMRect) {
    return {
        x: e.clientX - el.left,
        y: e.clientY - el.top
    };
}

// go through a given array of tracks and remove tracks that don't have any elements
export function cleanUpEmptyTracks(tracks: ITimelineTrack[]) {
    // check if there is an empty track in the array. If yes get the index
    const index = tracks.findIndex(track => !track.elements || track.elements.length === 0)

    if (index === -1) {
        return tracks
    }

    tracks.splice(index, 1)
}

// format a given time to a string in the format HH:MM:SS
export function formatPlaybackTime(time: number) {
    const milliseconds = Math.floor((time % 1000) / 10)
    const seconds = Math.floor((time / 1000) % 60)
    const minutes = Math.floor((time / (1000 * 60)) % 60)
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

    const hoursString = `${(hours < 10) ? "0" + hours : hours}`;
    const minutesString = (minutes < 10) ? "0" + minutes : minutes;
    const secondsString = (seconds < 10) ? "0" + seconds : seconds;
    const millisecondsString = `${(milliseconds < 10) ? "0" + milliseconds : milliseconds}`;

    return hoursString + ":" + minutesString + ":" + secondsString + "." + millisecondsString;
}

// check if a given element is fully scrolled
export function isElementFullyScrolled(el: HTMLElement): boolean {
    return el.scrollWidth - el.scrollLeft === el.clientWidth
}

// convert a given value in milliseconds to seconds
export function msToS(value: number) {
    return value / 1000
}

// convert a given value in seconds to milliseconds
export function sToMS(value: number) {
    return value * 1000
}

// format a given millseconds value to hours:minutes:seconds
export function msToHr(value: number) {

    let hours, minutes, seconds, total_hours, total_minutes, total_seconds;

    total_seconds = Math.floor(value / 1000);
    total_minutes = Math.floor(total_seconds / 60);
    total_hours = Math.floor(total_minutes / 60);

    seconds = (total_seconds % 60);
    minutes = (total_minutes % 60);
    hours = (total_hours % 24);

    const s = seconds < 10 ? '0' + seconds : seconds;
    const m = minutes < 10 ? '0' + minutes : minutes;
    const h = hours < 10 ? '0' + hours : hours;


    return h + ':' + m + ':' + s;
}

// check if a given element overlaps with any element on a given track
export function isElementOverlapping(elBounds: ITimelineElementBounds, trackEls: ITimelineElement[], ignoreElIndex?: number): boolean {
    return trackEls.some((trackEl, i) => {
        const trackElStart = trackEl.playbackStartTime
        const trackElEnd = trackEl.playbackStartTime + trackEl.duration

        // ignore this element when checking for overlapping
        if (ignoreElIndex !== undefined && i === ignoreElIndex) {
            return false
        }

        if ((elBounds.start >= trackElStart && elBounds.start < trackElEnd) || (elBounds.end > trackElStart && elBounds.end <= trackElEnd)) {
            return true
        }
    })
}

// move a given list of timeline elements according to given element bounds so they don't overlap
export function moveElementsOnTrack(elBounds: ITimelineElementBounds, trackEls: ITimelineElement[]) {
    let moveAmount: number | undefined = undefined

    const tracks = trackEls.map(trackEl => {
        const trackElBounds: ITimelineElementBounds = { start: trackEl.playbackStartTime, end: trackEl.playbackStartTime + trackEl.duration }

        // check for the first element the dropped element overlaps and get the amount the overlapped element needs to be moved to the right. Move every element after that by the same amount to the right so we move the whole "block" of element by the same amount
        if (isElementOverlapping(elBounds, [trackEl]) && moveAmount === undefined) {
            moveAmount = elBounds.end - trackElBounds.start;
        }

        // if moveAmount is defined move the current element by that amount
        if (moveAmount !== undefined) {
            trackEl.playbackStartTime += moveAmount
        }

        return trackEl
    })

    return tracks
}