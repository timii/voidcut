import type { ITimelineElement } from "./Timeline";

export interface IPlayerElement extends ITimelineElement {
    src?: string;
}

export interface IPlayerElementsMap { [x: string]: { el: HTMLElement; properties: IPlayerElement } }

export enum PreviewAspectRatio {
    E21_9 = '21/9',
    E16_9 = '16/9',
    E9_16 = '9/16',
    E4_3 = '4/3',
    E1_1 = '1/1',
}

// mapping aspect ratios to 1080p px values
export const aspectRatio1080pMap = new Map<PreviewAspectRatio, string>([
    [PreviewAspectRatio.E21_9, '2560x1080'],
    [PreviewAspectRatio.E16_9, '1920x1080'],
    [PreviewAspectRatio.E9_16, '1080x1920'],
    [PreviewAspectRatio.E4_3, '1440x1080'],
    [PreviewAspectRatio.E1_1, '1080x1080'],
])

// TODO: add more maps for 720p, etc
