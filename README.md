<h1>
<p align="center">
  <img src="./static/icon-accent-favicon-96.png" alt="Logo" width="128">
  <br>voidcut
</h1>
  <p align="center">
    Free, open-source and non-linear video editor designed to run entirely in your web browser.
    <br />
    <a href="https://timii.github.io/voidcut/">Try it out</a>
  </p>
</p>

## About

voidcut is a free, open-source and non-linear video editor designed to run entirely in your web browser. With no installation or downloads required, it's the perfect tool for quick video edits.

The goal of voidcut was to have some fun creating a simple tool that I can use myself without needing a subscription, learning more about designing and developing websites, and using FFMPEG in a practical use case along the way. It’s currently a work in progress and not finished.

## Features

- **Web-Based Convenience**: Accessible from any modern browser. No installation required.
- **Intuitive Interface**: Designed with simplicity in mind.
- **Non-Linear Editing**: Drag-and-drop timeline editing for easy trimming, cutting, and overlapping clips.
- **Simple Export**: Export and download your final masterpiece with a few clicks.
- **Easy Preview**: Directly preview your video. 
- **Local-only**: All processing happens locally in your browser; your files never leave your device.
- **Local Backup**: Current state is regularly saved locally to be able to reload the page and continue where you left off.

### Planned features

- **Effects & Filters**: Add more functionality to workbench such as rotation, changing aspect ratio, etc.
    - **Text Overlays**: Be able to add text with customizable styling.
    - **Audio Editing**: Be able to adjust the volume of different tracks.
- **Customizable Export**: Be able to export the result in different file formats, resolutions and compression levels
- **Manage Different Projects**: Add a start window to manage different projects
- **Responsive Layout**: Add styling for mobile devices

## Getting started

1. Open your browser and navigate to [https://timii.github.io/voidcut/](https://timii.github.io/voidcut/).
2. Upload your video, audio or image files.
3. Edit and customize your video.
4. Export and download your final masterpiece with a few clicks!

## Technologies Used

- [Svelte 4 + SvelteKit](https://svelte.dev/): For creating most of the website.
- [Tailwind CSS](https://tailwindcss.com/): For styling the application.
- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm): Used for video processing and exporting the final video.
