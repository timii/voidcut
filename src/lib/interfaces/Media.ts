export interface IMedia {
    name: string; // name of media
    mediaId: string; // unique id of media 
    type: MediaType; // enum type of media
    duration?: number; // duration in milliseconds (only relevant for video and audio)
}

export enum MediaType {
    Video = "VIDEO",
    Audio = "AUDIO",
    Image = "IMAGE"
}