export const replaceWallpaperIdFromLink = (url: string, wallpaperId: string): string => {
	const regex = /\/([^\/]+)\.webp$/;
	return regex.test(url) ? url.replace(regex, `/${wallpaperId}.webp`) : url;
};

export const getWallpaperIdFromLink = (url: string): string | null => {
	const regex = /\/([^\/]+)\.webp$/;
	const match = url.match(regex);
	return match ? match[1] : null;
};
