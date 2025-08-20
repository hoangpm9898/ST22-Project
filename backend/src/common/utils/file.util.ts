import * as fs from "fs/promises";
import * as path from "path";

export const delay = async (ms: number): Promise<void> => {
	return new Promise((resolve) => setTimeout(resolve, ms));
};

export const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
	const absolutePath = path.resolve(dirPath);
	try {
		await fs.access(absolutePath);
	} catch (error) {
		await fs.mkdir(dirPath, { recursive: true });
	}
};

export const readDirectory = async (dirPath: string): Promise<string[]> => {
	await ensureDirectoryExists(dirPath);
	try {
		return await fs.readdir(dirPath);
	} catch (error) {
		console.error(`[x] - Error reading folder [${dirPath}]: ${error.message}`);
		return [];
	}
};

export const readJSONFile = async <T = any>(filePath: string): Promise<T[]> => {
	try {
		const absolutePath = path.resolve(filePath);
		try {
			await fs.access(absolutePath);
		} catch {
			await fs.writeFile(absolutePath, JSON.stringify([]));
		}
		const fileContent = await fs.readFile(absolutePath, "utf8");
		if (!fileContent.trim()) return [];
		return JSON.parse(fileContent);
	} catch (error) {
		console.error(`[x] - Error reading JSON file [${filePath}]: ${error.message}`);
		return [];
	}
};

export const ensureJSONFileAndWrite = async <T = any>(filePath: string, data: T): Promise<void> => {
	try {
		const absolutePath = path.resolve(filePath);
		const dir = path.dirname(absolutePath);
		await ensureDirectoryExists(dir);
		await fs.writeFile(absolutePath, JSON.stringify(data, null, 2));
	} catch (error) {
		console.error(`[x] - Error writing JSON file [${filePath}]: ${error.message}`);
	}
};

export const mergeJSONArrays = async <T extends { id: any }>(filePath: string, newArray: T[]): Promise<void> => {
	try {
		const map = new Map<any, T>();
		const array = await readJSONFile<T>(filePath);
		array.forEach((item) => map.set(item.id, item));
		newArray.forEach((item) => map.set(item.id, item));
		await ensureJSONFileAndWrite(filePath, Array.from(map.values()));
	} catch (error) {
		console.error(`[x] - Error merge data in JSON file [${filePath}]: ${error.message}`);
	}
};
