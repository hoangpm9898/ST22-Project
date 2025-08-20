export const getMaxId = (listIds: number[]): number => {
	return Math.max(...listIds);
};

export const getRandomIdx = <T>(array: T[]): number => {
	return Math.floor(Math.random() * array.length);
};

export const getRandomElement = <T>(array: T[]): T => {
	return array[getRandomIdx(array)];
};

// Fisher-Yates Shuffle
export const shuffleArray = <T>(array: T[]): T[] => {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
};
