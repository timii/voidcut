import { MediaType } from "./Media";

export interface IFfmpegElement {
    videoData: Uint8Array; // video data as an UInt8Array 
    duration: number; // duration in ms
    offset: number; // offset in ms
    mediaType: MediaType; // type of media
    fileExtension: string; // file extension
}

export enum ExportState {
    NOT_STARTED = 'not_started',
    PROCESSING = 'processing',
    COMPLETE = 'complete',
    FAILED = 'failed',
}