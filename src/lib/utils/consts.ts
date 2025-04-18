export const CONSTS = {
    // ---------------------------------------------
    // General
    // ---------------------------------------------

    /**
     * The multiplier for calculatring between seconds and milliseconds
    */
    secondsMultiplier: 1000,

    /**
     * The amount of time to wait before resetting all dragged elements
    */
    resetDelay: 50,

    // ---------------------------------------------
    // Export
    // ---------------------------------------------

    /**
     * The amount of time between each interval for the export timer
     */
    exportIntervalTimer: 1000,

    // ---------------------------------------------
    // Preview
    // ---------------------------------------------

    /**
     * The button size for the preview controls
     */
    previewControlButtonSize: 32,

    // ---------------------------------------------
    // Media pool
    // ---------------------------------------------

    /**
     * The width of each media pool element in pixel
     */
    mediaPoolElementWidth: 128,

    /**
     * The height of each media pool element in pixel
     */
    mediaPoolElementHeight: 84,

    // ---------------------------------------------
    // Workbench
    // ---------------------------------------------

    /**
     * Workbench width for extra small screens (1 element per row) 
     */
    workbenchWidthXS: 176,

    /**
     * Workbench width for small screens (2 elements per row)
     */
    workbenchWidthS: 320,

    /**
     * Workbench width for medium screens (3 elements per row)
     */
    workbenchWidthM: 464,

    /**
     * Workbench width for large screens (4 elements per row)
     */
    workbenchWidthL: 608,

    // ---------------------------------------------
    // Timeline
    // ---------------------------------------------

    /**
     * The amount of time between each interval for the timeline playback while playing
     */
    playbackIntervalTimer: 50,

    /**
     * The height of each timeline row element in pixels
     */
    timelineRowElementHeight: 50,

    /**
     * The height of each timeline divider element in pixel
     */
    timelineDividerElementHeight: 12,

    /**
     * The amount of time between each interval when the timeline scrolls
     */
    timelineScrollIntervalTimer: 50,

    /**
     * The starting timeline scale
     */
    timelineStartingScale: 40,

    /**
     * The button size for the timeline controls
     */
    timelineControlButtonSize: 24,

    /**
     * The amount of pixels each timeline row is offset by on the left side
     */
    timelineRowOffset: 20,

    /**
     * The minimum amount to which a timeline element can be resized to (in milliseconds)
     */
    timelineElementMinWidthMs: 500,

    /**
     * The amount of pixels after which the timeline element is dragged
     */
    timelineElementThreshold: 3,

    // ---------------------------------------------
    // Event data transfer keys
    // ---------------------------------------------

    /**
     * The string used for identifying the data while dragging a media pool element
     */
    mediaPoolTransferKey: 'media-data',

    /**
     * The string used for identifying the data while dragging a timeline element
     */
    timelineElTransferKey: 'timeline-move-data',

    // ---------------------------------------------
    // Custom event names 
    // ---------------------------------------------

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

    // ---------------------------------------------
    // Local storage keys for saving state 
    // ---------------------------------------------

    /**
     * Key name for saving the timeline tracks
     */
    tracksStorageKey: "tracks",

    /**
     * Key name for saving the available media files
     */
    mediaStorageKey: "media",

    /**
     * Key name for saving the current timeline scale
     */
    timelineScaleStorageKey: "timeline-scale",

    /**
     * Key name for saving the current preview aspect ratio
     */
    previewAspectRatioStorageKey: "preview-aspect-ratio",

    /**
     * Key name for saving the time and date of last save
     */
    lastSaveStorageKey: "last-save",
}
