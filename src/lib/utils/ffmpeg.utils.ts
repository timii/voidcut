import { FFmpeg } from "@ffmpeg/ffmpeg";
import { availableMedia, exportOverlayOpen, exportState, ffmpegLoaded, ffmpegProgress, ffmpegProgressElapsedTime, ffmpegProgressPrevValue, previewAspectRatio, processedFile, processedFileSize, timelineTracks } from "../../stores/store";
import { get } from "svelte/store";
import { convertDataUrlToUIntArray, convertFileToDataUrl, resizeFilePreview, msToS, sToMS } from "./utils";
import { ExportState, type IFfmpegElement } from "$lib/interfaces/Ffmpeg";
import { adjustingInterval } from "./betterInterval";
import { CONSTS } from "./consts";
import { MediaType } from "$lib/interfaces/Media";
import { aspectRatio1080pMap } from "$lib/interfaces/Player";

let ffmpeg: FFmpeg
let elapsedTimeInterval: {
    start: () => void;
    stop: () => void;
}

// TODO: dynamically set an output file type and name
const outputFileName = 'output.mp4';

// #region initliaze ffmpeg
// initialize FFmpeg, setup logging and load necessary packages
export async function initializeFfmpeg() {

    // create a new ffmpeg instance
    ffmpeg = new FFmpeg();

    // listen to log events and print them into the console
    ffmpeg.on('log', ({ type, message }) => {
        console.log('[LOG] type:', type, 'message:', message);
    });

    // listen to progress events and print them into the console
    ffmpeg.on('progress', ({ progress, time }) => {
        const progressPercent = progress * 100
        const progressRounded = Math.round(progressPercent)
        const timeInS = time / 1000000
        console.log('[PROGRESS] progress:', progressPercent, 'time:', timeInS);

        // handle weird progress values 
        const prevProgessValue = get(ffmpegProgressPrevValue)
        ffmpegProgressPrevValue.set(progressRounded)
        if (prevProgessValue < 0 || progressRounded > 100) {
            ffmpegProgress.update(prevValue => prevValue)
        }
        else {
            ffmpegProgress.set(Math.max(0, Math.min(100, progressRounded)))
        }
    });

    // load ffmpeg-core inside web worker
    // it is required to call this method first as it initializes WebAssembly and other essential variables
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`
    });

    ffmpegLoaded.set(true)
    console.log('[FFMPEG] Ffmpeg core packages loaded');
}

// #region entry point
// entry point when starting export 
export async function callFfmpeg() {
    // start timer for elapsed time calculation
    startTimer()

    exportState.set(ExportState.PROCESSING)
    console.log('callFfmpeg called');

    // map timeline elements so they include all necessary information and can be used in ffmpeg
    const mediaData = mapTimelineElements()
    console.log('[FFMPEG] mapping of timeline elements successful');

    // create blank video with only black screen
    const blankVideoReturn = await createBlankVideo(mediaData)
    console.log('[FFMPEG] creation of blank video successful');

    // handle error cases when executing ffmpeg and stop execution
    if (blankVideoReturn !== 0) {
        exportState.set(ExportState.FAILED)
        stopTimer()
        return;
    }

    // map elements into ffmpeg flags and parameters
    const flags = createFfmpegFlags(mediaData)
    console.log('[FFMPEG] creating ffmpeg flags successful');

    // write necessary elements into ffmpeg.wasm filesystem
    await writeFilesToFfmpeg(mediaData)
    console.log('[FFMPEG] writing into ffmpeg filesystem successful');

    // execute ffmpeg with the created flags
    const execReturn = await ffmpeg.exec(flags)
    console.log('[FFMPEG] executing ffmpeg commands successful');

    // handle error cases when executing ffmpeg and stop execution
    if (execReturn !== 0) {
        exportState.set(ExportState.FAILED)
        stopTimer()
        return;
    }

    // read output file from ffmpeg.wasm
    const outputData = await ffmpeg.readFile(outputFileName) as Uint8Array;
    console.log('[FFMPEG] reading created output file successful');

    // set export state to be successful if we reached this point
    exportState.set(ExportState.COMPLETE)
    stopTimer()


    // calculate file size from processed file
    const fileSize = +(outputData.length / 1_048_576).toFixed(2)
    processedFileSize.set(fileSize)

    // write processed file into store
    processedFile.set(outputData)
    console.log('[FFMPEG] writing processed into store successful');
}

// #region mapping timeline
// get and map timeline elements and prepare them so they can be used in ffmpeg
function mapTimelineElements(): IFfmpegElement[] {
    // get all timeline elements and their properties
    const timelineElements = get(timelineTracks).flatMap(track => track.elements)
    console.log('callFfmpeg -> timelineElements:', timelineElements);

    const mediaData = timelineElements.map((el) => {
        // map each timeline element to a media element in the pool to get the source dataUrl
        const mediaEl = get(availableMedia).find((media) => media.mediaId === el.mediaId)!;

        // map media element and convert their source data url into UInt8Array that 
        // can be used in ffmpeg
        const splitFilename = mediaEl.name.split('.')
        const fileType = splitFilename && splitFilename.length > 1 ? splitFilename.pop() : ''
        return { uIntArr: convertDataUrlToUIntArray(mediaEl.src), fileType }
    });
    console.log('callFfmpeg -> mediaElements:', mediaData);

    const mappedElements: IFfmpegElement[] = mediaData.map((data, i) => {
        const timelineElement = timelineElements[i]
        return {
            mediaData: data.uIntArr,
            duration: timelineElement.duration,
            offset: timelineElement.playbackStartTime,
            mediaType: timelineElement.type,
            fileExtension: data.fileType
        } as IFfmpegElement
    })
    console.log('callFfmpeg -> mappedElements:', mappedElements);

    return mappedElements
}

// #region blank
async function createBlankVideo(mediaData: IFfmpegElement[]) {
    let maxLength = 0

    // go through each media element and get the latest point of any element for the blank video length
    mediaData.forEach(el => {
        // if the current element duration + offset are bigger than the maxLength, update it
        if (el.duration + el.offset > maxLength) {
            maxLength = el.duration + el.offset
        }
    })
    const maxLengthInS = maxLength / 1000


    // create a "video" with just a black screen and no audio
    // we will overlay every element on top of this "base" video 
    const flags: string[] = []

    // get the correct px values from the defined aspect ratio
    const aspectRatio = getExportSizing()
    flags.push(
        "-f", "lavfi", "-i", `color=size=${aspectRatio}:rate=60:color=black`, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-t", `${maxLengthInS}`, "blank.mp4"
    )

    // execute the blank video creation command and wait until its done
    const execReturn = await ffmpeg.exec(flags)

    return execReturn
}

// #region flags
// use the mapped timeline elements to dynamically create the necessary 
// ffmpeg flags and parameters 
function createFfmpegFlags(mediaData: IFfmpegElement[]): string[] {

    const flags: string[] = [];

    // include the blank video as the first input
    flags.push('-i', 'blank.mp4')

    // loop backwards through the array to fix the order of overlaying and add filenames as input flags
    for (let i = mediaData.length - 1; i >= 0; i--) {
        const fileName = createFileName(i + 1, mediaData[i].fileExtension);

        // push the -i flag with the input name
        flags.push('-i', fileName);
    }

    console.log("createFfmpegFlags -> flags:", flags)

    flags.push('-filter_complex')

    let filterNumber = 0
    let amixInputNumbers: number[] = []
    let overlayInputs: string[] = []
    let amixOutput: number
    let filterComplexString = ''
    // go over each element and map offsets to video and audio delays
    for (let i = mediaData.length - 1; i >= 0; i--) {
        const curEl = mediaData[i]
        const offsetInS = +msToS(curEl.offset).toFixed(2)
        const durationInS = +msToS(curEl.duration).toFixed(2)
        console.log("createFfmpegFlags in for each -> inputIndex:", i, "data:", curEl)
        const inputIndex = mediaData.length - i

        // ignore video delay for audio
        if (curEl.mediaType !== MediaType.Audio) {
            // set the video delay using the offset in seconds
            filterComplexString += `[${inputIndex}:v]setpts=expr=PTS+${offsetInS}/TB[${filterNumber}];`
        }

        if (overlayInputs.length === 0) {
            overlayInputs[0] = `0:v`
        }
        overlayInputs[1] = `${filterNumber}`

        let overlayEofAction = 'pass'
        let repeatLast = '1'
        if (i === 0) {
            // overlayEofAction = 'repeat'
            repeatLast = '0'
        }

        filterNumber += 1
        console.log("createFfmpegFlags in for each -> filterComplexString:", filterComplexString)

        // overlay the element between the offset and offset + duration
        filterComplexString += `[${overlayInputs[0]}][${overlayInputs[1]}]overlay=enable='between(t,${offsetInS},${offsetInS + durationInS})'[${filterNumber}];`
        overlayInputs[0] = `${filterNumber}`
        filterNumber += 1
        console.log("createFfmpegFlags in for each -> filterComplexString:", filterComplexString)

        // ignore audio delay for images 
        if (curEl.mediaType !== MediaType.Image) {
            // set the audio delay using the offset in ms
            filterComplexString += `[${inputIndex}:a]adelay=delays=${curEl.offset}:all=1[${filterNumber}];`
            amixInputNumbers.push(filterNumber)
            filterNumber += 1
            console.log("createFfmpegFlags in for each -> filterComplexString:", filterComplexString)
        }
    }

    // mix all the audio streams together
    const amixInputsString: string = amixInputNumbers.reduce((prev, curr) => {
        prev += `[${curr}]`
        return prev
    }, '')
    const amixInputs: string = '[0:a]' + amixInputsString
    filterComplexString += `${amixInputs}amix=inputs=${amixInputNumbers.length + 1}[${filterNumber}]`
    amixOutput = filterNumber
    console.log("createFfmpegFlags after for each -> filterComplexString:", filterComplexString)

    flags.push(filterComplexString)

    console.log("createFfmpegFlags -> flags:", flags)

    // map output of last overlay to ouput file
    flags.push('-map', `[${overlayInputs[0]}]`)
    // map output of amix to ouput file
    flags.push('-map', `[${amixOutput}]`)

    flags.push(`${outputFileName}`)

    console.log("createFfmpegFlags -> flags:", flags)
    console.log("createFfmpegFlags -> flags string:", flags.join(' '))

    // ffmpeg -i output.mp4 -i testvideo1.mp4 -i testvideo2.mp4 -filter_complex "[1:v]setpts=expr=PTS+5/TB[2];[1:a]adelay=delays=5s:all=1[3];[2:v]setpts=expr=PTS+0/TB[4];[2:a]adelay=delays=0s:all=1[6];[0:v][4]overlay=eof_action=pass[5];[5][2]overlay=eof_action=pass[out_v];[0:a][3][6]amix=inputs=3[out_a]" -map "[out_a]" -map "[out_v]" out.mp4

    //  change the flags to be dynamic
    // flags.push(
    //     '-filter_complex',
    //     `[0:v]setpts=expr=PTS+10/TB[1];
    //     [0:a]adelay=delays=10s:all=1[2];
    //     [1:a]adelay=delays=0s:all=1[5];
    //     [1:v]setpts=expr=PTS+0/TB[4];
    //     [4][1]overlay=eof_action=repeat[out_v];[2][5]amix[out_a]`, // change eof_action to try what works
    //     '-map', '[out_v]',
    //     '-map', '[out_a]',
    //     '-y', // overwrite output files without asking
    //     '-fps_mode', 'vfr',
    //     outputFileName)

    // [1:v]setpts=expr=PTS-STARTPTS,tpad=start_duration=10[4];


    // ffmpeg -i testvideo1.mp4 -i testvideo2.mp4 -filter_complex "[0:v]setpts=expr=PTS+0/TB[1];[0:a]adelay=delays=0s:all=1[2];[1:a]adelay=delays=10s:all=1[5];[1:v]setpts=expr=PTS-STARTPTS,tpad=start_duration=10[4];[4][1]overlay=eof_action=pass[out_v];[2][5]amix[out_a]" -map "[out_a]" -map "[out_v]" out.mp4

    return flags
}

// #region write files
// write given video data into ffmpeg.wasm filesystem
async function writeFilesToFfmpeg(mediaData: IFfmpegElement[]) {
    for (const [i, el] of mediaData.entries()) {
        const fileName = createFileName(i + 1, el.fileExtension);
        await ffmpeg.writeFile(fileName, el.mediaData);
    }
}

// #region create file name
// create a ffmpeg input file name string using the given index adn file extension
function createFileName(index: number, fileExtension: string) {
    return `input${index}.${fileExtension}`;
}

// #region download output
// convert output data into blob and download it
export function downloadOutput() {
    const data = get(processedFile) as Uint8Array<ArrayBuffer>
    const a = document.createElement('a');
    // TODO: dynamic output file type instead of hardcoding 'video/mp4' after we added logic for setting custom output name and file type
    a.href = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    a.download = outputFileName;

    setTimeout(() => {
        a.click();
    }, 1000);
}

// #region clean up
// clean up everything and reset store variables
export async function terminateFfmpegExecution() {
    console.log("terminateFfmpegExecution called")

    // terminate all api calls and web worker
    ffmpeg.terminate()

    // reset store values
    exportState.set(ExportState.NOT_STARTED)
    exportOverlayOpen.set(false)

    // initialize ffmpeg again so its directly usable again
    await initializeFfmpeg()
}

// #region export timer
// set up the interval for updating the elapsed time
function startTimer(): void {
    //reset the previous store value
    ffmpegProgressElapsedTime.set(0)

    const intervalCallback = () => {
        ffmpegProgressElapsedTime.update(value => value + CONSTS.exportIntervalTimer)
    }

    const doError = () => {
        console.warn('The drift exceeded the interval.');
    };

    // set up and start self adjusting interval
    elapsedTimeInterval = adjustingInterval(intervalCallback, CONSTS.exportIntervalTimer, doError)
    elapsedTimeInterval.start()
}

// clear the interval
function stopTimer(): void {
    if (elapsedTimeInterval) {
        elapsedTimeInterval.stop()
    }
}

// get the height and width of the output video (in px) from the aspect ratio in the store
function getExportSizing(): string {
    const aspectRatio = get(previewAspectRatio)

    // return the mapped aspect ratio to the correct px values
    return aspectRatio1080pMap.get(aspectRatio)!
}

// #region waveform
// generates an image of the waveform using ffmpeg from the given file
export async function generateAudioWaveform(file: File) {
    // convert audio file to DataUrl and then UIntArray first
    const audioDataUrl = await convertFileToDataUrl(file)
    const audioUIntArray = await convertDataUrlToUIntArray(audioDataUrl)

    const inputName = 'audioInput.wav'
    const outputName = 'audioOutput.png'
    // write audio in ffmpeg.wasm filesystem
    await ffmpeg.writeFile(inputName, audioUIntArray);
    console.log('[FFMPEG] writing into ffmpeg filesystem successful');

    const flags = ['-i', inputName, '-filter_complex', 'aformat=channel_layouts=mono,compand=gain=7:soft-knee=1,showwavespic=colors=#ffffff,drawbox=x=(iw-w)/2:y=(ih-h)/2:w=iw:h=1:color=#ffffff', '-frames:v', '1', outputName]
    // execute ffmpeg with the created flags
    const execReturn = await ffmpeg.exec(flags)
    console.log('[FFMPEG] executing ffmpeg commands successful');

    // handle error cases when executing ffmpeg and stop execution
    if (execReturn !== 0) {
        return undefined;
    }

    // read output file from ffmpeg.wasm
    const outputData = await ffmpeg.readFile(outputName) as Uint8Array<ArrayBuffer>;
    console.log('[FFMPEG] reading created output file successful');

    // turn outpout UIntArray into dataUrl
    const blob = new Blob([outputData.buffer], { type: 'image/png' })
    const dataUrl = await resizeFilePreview(blob as File)

    return dataUrl
}