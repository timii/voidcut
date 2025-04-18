import { MediaType, type IMedia, type IFileMetadata } from "$lib/interfaces/Media";
import {
    TimelineDropArea,
    TimelineElementResizeSide,
    type ITimelineElement,
    type ITimelineElementBounds,
} from "$lib/interfaces/Timeline";
import {
    availableMedia,
    isTimelineElementBeingDragged,
    isThumbBeingDragged,
    timelineTracks,
    currentPlaybackTime,
    currentTimelineScale,
    draggedElement,
    previewPlaying,
    isTimelineElementBeingResized,
    elementResizeData,
    maxPlaybackTime,
    draggedOverFirstDivider,
    draggedUnderLastDivider,
    previewAspectRatio,
} from "../../stores/store";
import { CONSTS } from "./consts";
import { adjustingInterval } from "./adjusting-interval";
import { get } from "svelte/store";
import resolveConfig from 'tailwindcss/resolveConfig'
import tailwindConfig from '../../../tailwind.config.js'
import { generateAudioWaveform } from "./ffmpeg.utils";
import type { IPlayerElement } from "$lib/interfaces/Player";
import type { Time } from "$lib/interfaces/Time";
import { generateAudioWaveformTimelineImage } from "./waveform.utils";
import { createTrackWithElement, handleOverlapping, handleElementIndeces } from "./timeline.utils";

let interval: {
    start: () => void;
    stop: () => void;
}

// #region file upload
// save a given array of media objects into the store 
export function saveFilesToStore(files: IMedia[]) {
    // add given array of file(s) into store
    availableMedia.update((arr) => [...arr, ...files]);
}

// handle given files when media is manually uploaded or drag and dropped
export async function handleFileUpload(files: FileList) {

    // convert FileList type to an array of files
    const filesArr = [...files];

    // add the files directly to the store but set "loaded" to false so they show up in the media pool as loading
    const mappedFiles: IMedia[] = filesArr.map(file => {
        // get the file type prefix
        const fileTypeString = file.type.split('/')[0].toUpperCase()

        // convert the string into an enum value
        const fileType = fileTypeString as MediaType

        return {
            name: file.name,
            mediaId: generateId(),
            type: fileType,
            // initially set loaded to false and update it later when preview image and metadata have been loaded
            loaded: false,
            previewImage: '',
            src: ''
        }
    })

    saveFilesToStore(mappedFiles);

    // update each media element that was just created with the loaded metadata and preview image
    for (const [i, file] of mappedFiles.entries()) {

        // get file metadata and create preview image
        const { fileMetadata, filePreviewImage } = await getFileMetadataAndPreviewImage(file.type, filesArr[i])

        // set the timeline image to be the preview image for image and video media files
        let fileTimelineElementImage = filePreviewImage

        // generate a separate image for the timeline element of the audio file  
        if (file.type === MediaType.Audio) {
            fileTimelineElementImage = await getTimelineElementImage(filesArr[i], fileMetadata.duration ?? 0)
        }

        availableMedia.update(media => {
            // find correct media element using its mediaId
            let index = media.findIndex(el => el.mediaId === file.mediaId)

            // check if an element was found
            if (index === -1) {
                console.error(`Media element with id ${file.mediaId} wasn't found in store`);
                return media;
            }

            // update element in store with file metadata, preview image and update loaded to true
            media[index] = {
                ...media[index],
                previewImage: filePreviewImage,
                timelineImage: fileTimelineElementImage,
                loaded: true,
                ...fileMetadata
            }

            return media;
        })
    }
}

// get the file metadata and create preview image from a given file and file type
async function getFileMetadataAndPreviewImage(fileType: MediaType, file: File) {
    let fileMetadata: IFileMetadata = {} as IFileMetadata
    let filePreviewImage: string = '';
    switch (fileType) {
        case MediaType.Audio:

            // get metadata for the audio file
            fileMetadata = await getFileMetadata(file, MediaType.Audio)

            // generate waveform image for the preview image
            const generatedImage = await generateAudioWaveform(file)
            if (generatedImage) {
                filePreviewImage = generatedImage
            }
            break;
        case MediaType.Image:

            // convert uploaded file into dataUrl and save it as the source of the image
            const fileAsDataUrl = await convertFileToDataUrl(file)
            fileMetadata = { src: fileAsDataUrl }

            // also create a resized version for the preview image for when dragging the media pool element
            const resizedFile = await resizeFilePreview(file)

            filePreviewImage = resizedFile

            break;
        case MediaType.Video:

            // get metadata of current file
            fileMetadata = await getFileMetadata(file, MediaType.Video)

            // create image of uploaded media to show as preview
            filePreviewImage = await getVideoPreviewImage(file)
            break;
        default:
            console.error("No fitting media type found")
    }
    return { fileMetadata, filePreviewImage }
}

// create timeline element image from a given file and duration
async function getTimelineElementImage(file: File, duration: number): Promise<string> {
    let fileTimelineElementImage: string = '';

    // calulate the starting size of the image shown in the timeline element
    const widthInPx = convertMsToPx(duration)

    // generate waveform image for the timeline element
    const generatedImage = await generateAudioWaveformTimelineImage(file, widthInPx)
    if (generatedImage) {
        fileTimelineElementImage = generatedImage
    }

    return fileTimelineElementImage
}

// handle given media when it's dropped into the timeline
export function handleTimelineMediaDrop(media: IMedia, dropArea: TimelineDropArea, rowIndex?: number, startTime?: number) {
    let maxDuration: number | undefined

    // for images we need to handle a few properties differently
    if (media.type === MediaType.Image) {
        maxDuration = undefined
    } else {
        maxDuration = media.duration || 3000
    }

    // TODO: handle cases for media thats very short (such as half a second or less or so) 

    // convert media type to timeline element type
    const timelineEl: ITimelineElement = {
        duration: media.duration ? media.duration : 3000, // starting duration will be the same as the maxDuration
        maxDuration: maxDuration,
        playbackStartTime: startTime ? startTime : 0,
        trimFromStart: 0,
        trimFromEnd: 0,
        mediaId: media.mediaId,
        mediaName: media.name,
        mediaImage: media.previewImage,
        timelineImage: media.timelineImage,
        type: media.type,
        elementId: generateId(),
        videoOptions: {}
    }

    // create an empty track with the newly created element
    const timelineTrack = createTrackWithElement(timelineEl)

    // handle the element drop differently depending on where the element was dropped (timeline, divider or track)
    switch (dropArea) {
        // element dropped on the timeline but not a track or divider
        case TimelineDropArea.TIMELINE:

            // add the newly created track to the end of the timeline track array
            timelineTracks.update(arr => [...arr, timelineTrack])

            break;

        // element dropped on a timeline divider
        case TimelineDropArea.DIVIDER:

            // check if rowIndex is undefind, if thats the case we can't add the new track at the correct position so we break out of the switch case
            if (rowIndex === undefined) {
                break;
            }

            // add the newly created track at the given index into timeline track array 
            timelineTracks.update(arr => arr.toSpliced(rowIndex, 0, timelineTrack))
            break;

        // element dropped on a timeline track
        case TimelineDropArea.TRACK:

            // check if rowIndex or startTime is undefind, if thats the case we can't add the new element at the correct position and time so we break out of the switch cases
            if (rowIndex === undefined || startTime === undefined) {
                break;
            }

            // add new timeline element into given row index
            timelineTracks.update(tracks => {

                // convert the dragged element bounds from px into ms
                const elBounds: ITimelineElementBounds = {
                    start: timelineEl.playbackStartTime,
                    end: timelineEl.playbackStartTime + timelineEl.duration
                };

                // check and handle if any elements overlap after adding the element and update the track elements if necessary
                tracks[rowIndex].elements = handleOverlapping(
                    elBounds,
                    tracks[rowIndex].elements,
                    undefined // we also set this to be undefined since the element was was just created, so it doesn't ahve a previous index
                );

                // check and handle if the element with the updated start time is still at the correct index and if not update the track elements
                tracks[rowIndex].elements = handleElementIndeces(
                    timelineEl,
                    elBounds.start,
                    tracks[rowIndex].elements,
                    tracks[rowIndex].elements.length, // we use the current length here and not length - 1 since we will add the element inside the function and then the length will be increased by one and we want the index of the last element
                    true
                );

                return tracks
            })

            break;

        default:
            // shouldn't be reachable
            console.error(`No correct drop area was provided: drop area ${dropArea} not defined`)
            break;
    }
}

//#endregion

// #region file helpers
// creates a preview image using a given file
function getVideoPreviewImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const video = document.createElement("video");

        video.src = URL.createObjectURL(file);

        video.onloadeddata = () => {
            let ctx = canvas.getContext("2d");

            // resize the canvas to be the same size as the media pool element to resize it
            canvas.width = CONSTS.mediaPoolElementWidth;
            canvas.height = CONSTS.mediaPoolElementHeight;

            if (!ctx) {
                reject()
                return;
            }

            ctx.drawImage(video, 0, 0, CONSTS.mediaPoolElementWidth, CONSTS.mediaPoolElementHeight);
            video.pause();
            URL.revokeObjectURL(video.src)
            return resolve(canvas.toDataURL('image/png'));
        };
    })
}

// get metadata from a given file 
function getFileMetadata(file: File, type: MediaType.Video | MediaType.Audio): Promise<IFileMetadata> {
    return new Promise(async (resolve, reject) => {
        // create html element to "hold" each file and only preload its metadata
        let placeholderEl: HTMLVideoElement | HTMLAudioElement
        if (type === MediaType.Video) {
            placeholderEl = document.createElement('video') as HTMLVideoElement;
        } else {
            placeholderEl = document.createElement('audio') as HTMLAudioElement
        }
        placeholderEl.preload = 'metadata';

        // create blob out of file and pass it as a source to the video element
        placeholderEl.src = await convertFileToDataUrl(file)

        // add event listener to when metadata has loaded
        placeholderEl.onloadedmetadata = () => {
            const duration = placeholderEl.duration;

            // calculate the duration in milliseconds and round it to the nearest integer  
            const durationInMs = Math.round(duration * CONSTS.secondsMultiplier)

            window.URL.revokeObjectURL(placeholderEl.src);

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

// resizes a given file to given width and height (defaults are the dimensions of the media pool element)
export function resizeFilePreview(file: File, width = CONSTS.mediaPoolElementWidth, height = CONSTS.mediaPoolElementHeight): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!FileReader) {
            console.error('Error getting FileReader')
            reject('Error getting FileReader')
        }

        let fr = new FileReader();

        // read file content as a dataUrl
        fr.readAsDataURL(file);

        // add eventlistener to when the FileReader finished loading
        fr.onload = () => {
            const img = new Image();
            img.src = fr.result as string;

            img.onload = () => {
                // create a new canvas element where the image will be loaded into
                const canvas = document.createElement('canvas');

                // set the canvas to be the same height as the media pool element
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.error('Error getting canvas context')
                    reject('Error getting canvas context')

                }

                // get ratios between both height and width
                const hRatio = canvas.width / img.width;
                const vRatio = canvas.height / img.height;

                // use smaller ratio for scaling image into canvas
                const ratio = Math.min(hRatio, vRatio);

                // x and y positions to center scaled image
                const centerX = (canvas.width - img.width * ratio) / 2;
                const centerY = (canvas.height - img.height * ratio) / 2;

                // draw the image at correct image and with correct size
                ctx!.drawImage(img, 0, 0, img.width, img.height,
                    centerX, centerY, img.width * ratio, img.height * ratio);


                // return the dataUrl string of the resized image
                const resizedImage = ctx!.canvas.toDataURL();
                resolve(resizedImage as string)
            }
        };

        // add eventlistener to when the FileReader throws an error
        fr.onerror = (err) => {
            console.error("Error while converting File to DataUrl", err)
            reject(err)
        }
    })
}

// convert a given file into a data url string
export function convertFileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!FileReader) {
            console.error('Error getting FileReader')
            reject('Error getting FileReader')
        }

        let fr = new FileReader();

        // read file content as a dataUrl
        fr.readAsDataURL(file);

        // add eventlistener to when the FileReader finished loading
        fr.onload = () => {
            // return result of the reader as a dataUrl
            resolve(fr.result as string)
        };

        // add eventlistener to when the FileReader throws an error
        fr.onerror = (err) => {
            console.error("Error while converting File to DataUrl", err)
            reject(err)
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

//#endregion

// #region playback
// stop interval that handles the current playback time
export function pausePlayback() {
    previewPlaying.set(false)
    if (interval) {
        interval.stop()
    }
}

// create interval that increases current playback time
export function resumePlayback() {
    previewPlaying.set(true)
    const intervallCallback = () => {
        const previousValue = get(currentPlaybackTime)
        const nextValue = previousValue + CONSTS.playbackIntervalTimer

        // pause playback if its after the max playback time
        if (nextValue > get(maxPlaybackTime)) {
            pausePlayback()
        } else {
            // increase the current playback time in store by timeout amount
            currentPlaybackTime.update(value => value + CONSTS.playbackIntervalTimer)
        }
    }

    const doError = () => {
        // console.warn('The drift exceeded the interval.');
    };

    // create new interval with callbacks
    interval = adjustingInterval(intervallCallback, CONSTS.playbackIntervalTimer, doError);

    // manually start the intervals
    interval.start()
}

// check if the current playback time is inside given element bounds  
export function isPlaybackInElement(el: IPlayerElement): boolean {
    // calculate element bounds using the playback start time and the duration
    const elBounds: ITimelineElementBounds = { start: el.playbackStartTime, end: el.playbackStartTime + el.duration }

    const playbackTime = get(currentPlaybackTime)

    // return if the current playback time is between the start and end time of the element 
    return playbackTime >= elBounds.start && playbackTime < elBounds.end
}

// get the current element time for a given media element 
export function getCurrentMediaTime(el: IPlayerElement): number {
    // get the start time of the element considering the playback start time and the left trim
    const elStartTime = el.playbackStartTime - el.trimFromStart;

    // calculate the time where from where the media element should be played
    return (get(currentPlaybackTime) - elStartTime) / CONSTS.secondsMultiplier;
}

//#endregion

// #region general utils
// convert a given pixel value into a milliseconds value using the current timeline scale
export function convertPxToMs(value: number) {
    return Math.round((value / get(currentTimelineScale)) * CONSTS.secondsMultiplier) || 0
}

// convert a given milliseconds value into a pixel value using the current timeline scale
export function convertMsToPx(value: number) {
    return Math.round((value / CONSTS.secondsMultiplier) * get(currentTimelineScale))
}


// generate a unique id
export function generateId() {
    return crypto.randomUUID() as string
}

// set all "beingDragged" values in store to false 
export function resetAllBeingDragged() {
    isThumbBeingDragged.set(false)
    isTimelineElementBeingDragged.set(false)
    isTimelineElementBeingResized.set(false)
    draggedElement.set(null)
}

// reset all over/under dividers helper store values
export function resetOverUnderDividers() {
    if (get(draggedOverFirstDivider)) {
        draggedOverFirstDivider.set(false)
    }

    if (get(draggedUnderLastDivider)) {
        draggedUnderLastDivider.set(false)
    }
}

// get all tailwind variables to use in components
export function getTailwindVariables() {
    return resolveConfig(tailwindConfig)
}

// get relative mouse coordinates to the given element DOMRect
export function getRelativeMousePosition(e: MouseEvent, el: DOMRect) {
    return {
        x: e.clientX - el.left,
        y: e.clientY - el.top
    };
}

// check if only the primary button is clicked for a given MouseEvent
export function onlyPrimaryButtonClicked(e: MouseEvent) { return e.buttons === 1 }

// check if a given element is of type image
export function elementIsAnImage(el: ITimelineElement | IMedia) {
    return el.type === MediaType.Image
}

// check if dragged element is a media pool element
export function isDraggedElementFromMediaPool(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) {
        return false
    }

    // if the dataTransfer object contains an item with the media pool transfer key we know the dragged element is a media pool element
    return dataTransfer.getData(CONSTS.mediaPoolTransferKey) === '' ? false : true
}

// check if dragged element is a media pool element
export function isDraggedElementAFile(list: DataTransferItemList | undefined): boolean {
    if (!list || list.length === 0) {
        return false
    }

    // if the data transfer items list contains an item with the kind "file" we know the dragged element is a file
    let containsFile = false
    for (const item of list) {
        if (item.kind === 'file') {
            containsFile = true;
            break;
        }
    }

    return containsFile
}

// checks if a given bounding rect has only 0s as values
export function allBoundingRectValuesZero(element: Element): boolean {
    const boundingRect = element.getBoundingClientRect()
    const values = Object.values(boundingRect)
    return values.every(value => !value || value === 0)
}

// check if a given width and height have the same ratio as the aspect ratio defined in the store
export function isSameAspectRatio(width: number, height: number): boolean {
    // get aspect ratio from store as a string
    const aspectRatioString = get(previewAspectRatio)
    // convert string to array of 2 numbers for the aspect ratio (first element: width, second: height)
    const aspectRatios = aspectRatioString.split('/')
    // calculate the ratio between both values
    const storeRatio = +(+aspectRatios[0] / +aspectRatios[1]).toFixed(2)

    // calculate ratio between given width and height (only include first two digits after dot)
    const givenRatio = +(width / height).toFixed(2)

    return storeRatio === givenRatio
}

// delays further async running by given ms amount (mainly used for testing) 
export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// check if current build is production build
export function isProduction(): boolean {
    return import.meta.env.PROD
}

// wrapper utils function to stop propagation for a given event
export function stopPropagation(e: Event) {
    e.stopPropagation();
}

// prints a given message only in development build
export function debugLog(message: string) {
    if (!isProduction()) {
        console.log(message)
    }
}

//#endregion

// #region scrolling utils
// calculate if a given html element has a horizontal scrollbar
export function hasHorizontalScrollbar(el: HTMLElement) {
    return el.scrollWidth > el.clientWidth;
}

// calculate if a given html element has a vertical scrollbar
export function hasVerticalScrollbar(el: HTMLElement) {
    return el.scrollHeight > el.clientHeight;
}

// check if a given element is fully scrolled
export function isElementFullyScrolled(el: HTMLElement): boolean {
    return el.scrollWidth - el.scrollLeft === el.clientWidth
}

//#endregion

// #region time formatters
// for a given time in ms, calculate and return hours, minutes, seconds and milliseconds
export function getTimes(time: number): Time {
    const milliseconds = Math.floor((time % 1000) / 10)
    const seconds = Math.floor((time / 1000) % 60)
    const minutes = Math.floor((time / (1000 * 60)) % 60)
    const hours = Math.floor((time / (1000 * 60 * 60)) % 24);

    return {
        hours,
        minutes,
        seconds,
        milliseconds
    }
}

// format a given time (in ms) to a string in the format HH:MM:SS.ms
export function formatPlaybackTime(time: number) {
    const { hours, minutes, seconds, milliseconds } = getTimes(time)

    const hoursString = (hours < 10) ? "0" + hours : hours;
    const minutesString = (minutes < 10) ? "0" + minutes : minutes;
    const secondsString = (seconds < 10) ? "0" + seconds : seconds;
    const millisecondsString = (milliseconds < 10) ? "0" + milliseconds : milliseconds;

    // if its less than an hour don't show the hours
    if (hours === 0) {
        return minutesString + ":" + secondsString + "." + millisecondsString
    }
    return hoursString + ":" + minutesString + ":" + secondsString + "." + millisecondsString;
}

// format a given time (in ms) to a string in the format HH:MM:SS
export function formatTime(value: number, showLeadingZero = true) {
    const { hours, minutes, seconds, milliseconds } = getTimes(value)

    const s = seconds < 10 ? '0' + seconds : seconds;
    const m = minutes < 10 && showLeadingZero ? '0' + minutes : minutes;
    const h = hours < 10 && showLeadingZero ? '0' + hours : hours;

    // if its less than an hour don't show the hours
    if (hours === 0) {
        return m + ':' + s;
    }
    return h + ':' + m + ':' + s;
}

// convert a given value in milliseconds to seconds
export function msToS(value: number) {
    return value / CONSTS.secondsMultiplier
}

// convert a given value in seconds to milliseconds
export function sToMS(value: number) {
    return value * CONSTS.secondsMultiplier
}
//#endregion