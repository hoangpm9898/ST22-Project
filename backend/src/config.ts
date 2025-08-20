import "dotenv/config";
import z from "zod";
import { parseEnv, port } from "znv";

const createConfigFromEnvironment = (environment: NodeJS.ProcessEnv) => {
	const config = parseEnv(environment, {
		NODE_ENV: z.enum(["development", "production"]).default("development"),
		LOG_LEVEL: z
			.enum(["fatal", "error", "warn", "log", "debug", "verbose"])
			.array()
			.default(["fatal", "error", "warn", "log", "debug", "verbose"]),
		// Web server Configurations
		PORT: port().default(3000),
		// API Server Configurations
		RESOURE_HOST_URL: z.string().default("http://localhost:3000"),
		RESOURE_APP_CODE: z.string().default("st22d"),
		RESOURE_APP_VERSION: z.string().default("v1"),
		// Redis Configurations
		REDIS_HOST: z.string().default("localhost"),
		REDIS_PORT: port().default(6379),
		REDIS_PASSWORD: z.string().optional(),
		//Bunny Configurations
		BUNNY_CDN_HOST: z.string(),
		BUNNY_CDN_ACCESS: z.string(),
		BUNNY_CDN_API_KEY: z.string(),
		BUNNY_CDN_USERNAME: z.string(),
		BUNNY_CDN_PASSWD: z.string(),
		BUNNY_ZONE_NAME: z.string(),
		BUNNY_ZONE_ID: z.string(),
		// Path to the data directory
		APP_RESULTS_PATH: z.string().default("data/app"),
		// Album data
		RESULTS_PATH: z.string().default("data/albums/results"),
		ALBUMS_PATH: z.string().default("data/albums/albums.json"),
		WALLPAPERS_PATH: z.string().default("data/albums/wallpapers.json"),
		// Profile data
		PROFILES_UPLOADS_PATH: z.string().default("data/profiles/uploads"),
		PROFILES_RESULTS_PATH: z.string().default("data/profiles/results"),
		PROFILES_DATA_PATH: z.string().default("data/profiles/profiles.json"),
		PROFILES_WALLPAPERS_PATH: z.string().default("data/profiles/wallpapers.json"),
		// ... data
		FILE_PATH_BLACKLIST: z.string().default("data/blacklist-items.json"),
		FILE_PATH_LIST_TRACKING_COLL: z.string().default("data/tracking-collections.json"),
		// google sheet configurations
		GOOGLE_SHEET_ID: z.string(),
		GOOGLE_SHEET_NAME: z.string(),
		GOOGLE_API_KEY: z.string(),
		// General configurations
		MAX_ALBUMS_BATCH: z.number().default(5),
		CTG_FORYOU_ID: z.number().default(0),
		FILTER_BY_IMAGE_ASPECT_RATIO: z.string().default("ENABLE"),
	});

	return {
		...config,
		isDev: process.env.NODE_ENV === "development",
		isProd: process.env.NODE_ENV === "production",
	};
};

export type Config = ReturnType<typeof createConfigFromEnvironment>;

export const config: Config = createConfigFromEnvironment(process.env);
