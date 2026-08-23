type ImageFactory = () => Pick<HTMLImageElement, 'src'>;

export function preloadImages(imageUrls: string[], createImage: ImageFactory = () => new Image()) {
	for (const imageUrl of imageUrls) {
		createImage().src = imageUrl;
	}
}
