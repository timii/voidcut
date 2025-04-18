# voidcut

<h1>
<p align="center">
  <img src="./static/icon-accent-favicon-96.png" alt="Logo" width="128">
  <br>voidcut
</h1>
  <p align="center">
    Free, open-source and non-linear video editor designed to run entirely in your web browser.
    <br />
    <a href="#about">About</a>
    ·
    <a href="">Try it out</a>
    <!-- · -->
    <!-- <a href="#documentation">Documentation</a> -->
  </p>
</p>

## About

voidcut is a free, open-source and non-linear video editor designed to run entirely in your web browser. With no installation or downloads required, it's the perfect tool for quick video edits, supporting a wide range of features.

The goal of voidcut was to create a simple tool that I can use myself without needing a subscription, and learning more about designing and developing websites and using FFMPEG in a practical use case along the way.

## Features

- **Web-Based Convenience**: Accessible from any modern browser. No installation required.
- **Intuitive Interface**: Designed with simplicity in mind.
- **Non-Linear Editing**: Drag-and-drop timeline editing for easy trimming, cutting, and overlapping clips.
- **Simple Export**: Export and download your final masterpiece with two clicks.
- **Easy Preview**: Directly preview your video. 
- **Local-only**: All processing happens locally in your browser; your files never leave your device.

### Planned features

- **Effects & Filters**: Add more functionlity to workbench such as rotation, changing aspect ration, etc.
    - **Text Overlays**: Be able to add text with customizable styling.
    - **Audio Editing**: Be able to adjust volume of different tracks.
- **Customizable Export**: Be able to export the result in different file formats, resolutions and compression levels
- **Filmstrips**: Show "filmstrips" for image and video elements in the timeline
- **Local Backup**: Current state is regularly saved in local storage to be able to reload page and keep the changes
- **Manage Different Projects**: Add a start window to manage different projects
- **Responsive Layout**: Add styling for mobile devices

## Getting started

1. Open your browser and navigate to (TODO include link).
2. Upload your video, audio or images files.
3. Edit, enhance, and customize your video.
4. Export and download your final masterpiece with two clicks!

## Technologies Used

- [Svelte 4 + SvelteKit](https://svelte.dev/): For creating most of the website.
- [Tailwind CSS](https://tailwindcss.com/): For styling the application.
- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm): Used for video processing and exporting the final video.