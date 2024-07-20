import { FFmpeg } from "@ffmpeg/ffmpeg";
import { availableMedia, ffmpegLoaded, timelineTracks } from "../../stores/store";
import { get } from "svelte/store";
import { convertDataUrlToUIntArray, msToS, sToMS } from "./utils";
import { type IFfmpegElement } from "$lib/interfaces/Ffmpeg";

let ffmpeg: FFmpeg

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
        console.log('[PROGRESS] progress:', progress * 100, 'time:', time / 1000000);
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

// entry point when starting export 
export async function callFfmpeg() {
    console.log('callFfmpeg called');

    // get and map timeline elements so they can be used in ffmpeg
    const videoData = mapTimelineElementsToUIntArray()
    console.log('[FFMPEG] mapping of timeline elements successful');

    // map elements into ffmpeg flags and parameters
    const { outputFileName, flags } = createFfmpegFlags(videoData)
    console.log('[FFMPEG] creating ffmpeg flags successful');

    // write necessary elements into ffmpeg.wasm filesystem
    await writeFilesToFfmpeg(videoData)
    console.log('[FFMPEG] writing into ffmpeg filesystem successful');

    // execute ffmpeg with the created flags
    await ffmpeg.exec(flags)
    console.log('[FFMPEG] executing ffmpeg commands successful');

    // TODO: handle error cases when executing

    // read output file from ffmpeg.wasm
    const outputData = await ffmpeg.readFile(outputFileName) as Uint8Array;
    console.log('[FFMPEG] reading created output file successful');

    // download read file
    downloadOutput(outputData, outputFileName)
    console.log('[FFMPEG] downloading output file successful');
}

// get and map timeline elements and prepare them so they can be used in ffmpeg
function mapTimelineElementsToUIntArray(): IFfmpegElement[] {
    // get all timeline elements and their properties
    const timelineElements = get(timelineTracks).flatMap(track => track.elements)
    console.log('callFfmpeg -> timelineElements:', timelineElements);

    // TODO: refactor following two maps into one
    // map each element to a media element in the pool to get the source dataUrl
    const mediaElements = timelineElements.map((el) => {
        return get(availableMedia).find((media) => media.mediaId === el.mediaId)!;
    });
    console.log('callFfmpeg -> mediaElements:', mediaElements);

    // map media elements and convert their source data url into UInt8Array that 
    // can be used in ffmpeg
    const videoData = mediaElements.map((el) => convertDataUrlToUIntArray(el.src));
    console.log('callFfmpeg -> videoData:', videoData);

    const mappedElements: IFfmpegElement[] = videoData.map((data, i) => {
        const timelineElement = timelineElements[i]
        return {
            videoData: data,
            duration: timelineElement.duration,
            offset: timelineElement.playbackStartTime
        }
    })
    console.log('callFfmpeg -> mappedElements:', mappedElements);

    return mappedElements
}

// use the mapped timeline elements to dynamically create the necessary 
// ffmpeg flags and parameters 
function createFfmpegFlags(videoData: IFfmpegElement[]): { outputFileName: string, flags: string[] } {

    const flags: string[] = [];

    videoData.forEach((data, i) => {
        const fileName = createFileName(i + 1);

        // push the -i flag with the input data
        flags.push('-i', fileName);
    })

    // TODO: dynamically set an output file type and name
    const outputFileName = 'output.mp4';

    const offset = +msToS(videoData[1].offset).toFixed(2)
    const duration = +msToS(videoData[1].duration).toFixed(2)
    const offsetPlusDuration = +(offset + duration).toFixed(2)
    console.log("createFfmpegFlags -> offset:", offset, duration, offsetPlusDuration)

    // TODO: change the flags to be dynamic
    flags.push(
        '-filter_complex',
        `[0:v]setpts=expr=PTS+5/TB[1];
        [0:a]adelay=delays=5s:all=1[2];
        [1:v][1]overlay[out_v];
        [2][1:a]amix[out_a]`,
        '-map', '[out_v]',
        '-map', '[out_a]',
        '-y', // overwrite output files without asking
        '-fps_mode', 'vfr',
        outputFileName)

    // ffmpeg -i testvideo1.mp4 -i testvideo2.mp4 -filter_complex "[0:v]setpts=expr=PTS+15/TB[1];[0:a]adelay=delays=15s:all=1[2];[1:v][1]overlay[out_v];[2][1:a]amix[out_a]" -map "[out_a]" -map "[out_v]" out.mp4

    return { outputFileName, flags }
}

// write given video data into ffmpeg.wasm filesystem
async function writeFilesToFfmpeg(videoData: IFfmpegElement[]) {
    for (const [i, el] of videoData.entries()) {
        const fileName = createFileName(i + 1);
        await ffmpeg.writeFile(fileName, el.videoData);
    }
}

// create a input file name using the given index
function createFileName(index: number) {
    // TODO: handle different input file types
    return `input${index}.mp4`;
}

// convert output data into blob and download it
function downloadOutput(data: Uint8Array, outputFileName: string) {
    const a = document.createElement('a');
    // TODO: dynamic output file type instead of hardcoding 'video/mp4'
    a.href = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    a.download = outputFileName;

    setTimeout(() => {
        a.click();
    }, 1000);
}