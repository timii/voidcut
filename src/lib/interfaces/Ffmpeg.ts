export interface IFfmpegElement {
    videoData: Uint8Array; // video data as an UInt8Array 
    duration: number; // duration in ms
    offset: number; // offset in ms
}