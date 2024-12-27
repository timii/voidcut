export const CONSTS = {
    /**
     * The amount of time between each interval for the timeline playback while playing
     */
    playbackIntervalTimer: 50,

    /**
     * The amount of time between each interval for the export timer
     */
    exportIntervalTimer: 1000,

    /**
     * The multiplier for calculatring between seconds and milliseconds
     */
    secondsMultiplier: 1000,

    /**
     * The amount of time to wait before resetting all dragged elements
     */
    resetDelay: 50,

    /**
     * The width of each media pool element in pixel
     */
    mediaPoolElementWidth: 128,

    /**
     * The height of each media pool element in pixel
     */
    mediaPoolElementHeight: 84,

    /**
     * The amount of time between each interval when the timeline scrolls
     */
    timelineScrollIntervalTimer: 50,

    /**
     * The amount of pixels each timeline row is offset by on the left side
     */
    timelineRowOffset: 20,

    /**
     * The minimum amount to which a timeline element can be resized to (in milliseconds)
     */
    timelineElementMinWidthMs: 1000,

    /**
     * The string used for identifying the data while dragging a media pool element
     */
    mediaPoolTransferKey: 'media-data',

    /**
     * The string used for identifying the data while dragging a timeline element
     */
    timelineElTransferKey: 'timeline-move-data',

    /**
     * The custom event name for when a timeline element is dropped
     */
    customEventNameDropTimelineElement: 'drop-timeline-element',

    /**
     * The custom event name for when a timeline element is resized on the left side
     */
    customEventNameElementResizeLeft: 'resize-timeline-element-left',

    /**
     * The custom event name for when a timeline element is resized on the right side
     */
    customEventNameElementResizeRight: 'resize-timeline-element-right',
}
