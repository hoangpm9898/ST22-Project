import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function readJSONFile<T = any>(filePath: string): Promise<T[]> {
	try {
		const absolutePath = path.resolve(filePath);
		if (!fs.existsSync(absolutePath)) {
			console.log(`📁 File not found: ${filePath}`);
			return [];
		}
		const fileContent = fs.readFileSync(absolutePath, "utf-8");
		if (!fileContent.trim()) return [];
		return JSON.parse(fileContent);
	} catch (error) {
		console.error(`❌ Error reading JSON file [${filePath}]: ${error.message}`);
		return [];
	}
}

async function seedCategories() {
	console.log("🌱 Seeding categories...");
	try {
		const categories = await readJSONFile("data/albums/categories.json");

		await prisma.category.deleteMany();
		for (const category of categories) {
			await prisma.category.create({
				data: {
					id: category.id,
					name: category.name,
					thumb: category.thumb || "",
				},
			});
		}

		console.log(`✅ Seeded ${categories.length} categories`);
	} catch (error) {
		console.error("❌ Error seeding categories:", error);
	}
}

async function seedTags() {
	console.log("🌱 Seeding tags...");
	try {
		const tags = await readJSONFile("data/albums/tags.json");

		await prisma.tag.deleteMany();
		for (const tag of tags) {
			await prisma.tag.create({
				data: {
					id: tag.id,
					name: tag.name,
					thumb: tag.thumb || "",
				},
			});
		}

		console.log(`✅ Seeded ${tags.length} tags`);
	} catch (error) {
		console.error("❌ Error seeding tags:", error);
	}
}

async function seedCountries() {
	console.log("🌱 Seeding countries...");
	try {
		const countries = await readJSONFile("data/albums/countries.json");

		await prisma.country.deleteMany();
		for (const country of countries) {
			await prisma.country.create({
				data: {
					id: country.id,
					name: country.name,
				},
			});
		}

		console.log(`✅ Seeded ${countries.length} countries`);
	} catch (error) {
		console.error("❌ Error seeding countries:", error);
	}
}

async function seedWallpapers() {
	console.log("🌱 Seeding wallpapers...");
	try {
		const wallpapers = await readJSONFile("data/albums/wallpapers.json");

		await prisma.wallpaper.deleteMany();
		for (const wallpaper of wallpapers) {
			await prisma.wallpaper.create({
				data: {
					id: wallpaper.id,
					name: wallpaper.name || "",
					url: wallpaper.url || "",
					preview_url: wallpaper.preview_url || "",
					albumId: wallpaper.albumId ? BigInt(wallpaper.albumId) : null,
					modelId: wallpaper.model_id || "",
					authorId: wallpaper.author_id || "",
					folderNo: wallpaper.folder_no || "default",
					trackingType: wallpaper.tracking_type || "work",
					trackingCollectionId: wallpaper.tracking_collection_id || 0,
				},
			});
		}

		console.log(`✅ Seeded ${wallpapers.length} wallpapers`);
	} catch (error) {
		console.error("❌ Error seeding wallpapers:", error);
	}
}

async function seedAlbums() {
	console.log("🌱 Seeding albums...");
	try {
		const albums = await readJSONFile("data/albums/albums.json");

		await prisma.album.deleteMany();
		for (const album of albums) {
			await prisma.album.create({
				data: {
					id: album.id,
					name: album.name,
					thumb: album.thumb || "",
					categoryId: album.categoryId || 0,
					tags: album.tags || [],
					countries: album.countries || [],
					wallpaperIds: album.wallpaperIds || [],
					nsfwAdult: album.nsfw?.adult || [],
					nsfwRacy: album.nsfw?.racy || [],
					mapStatus: album.mapStatus || false,
				},
			});
		}

		console.log(`✅ Seeded ${albums.length} albums`);
	} catch (error) {
		console.error("❌ Error seeding albums:", error);
	}
}

async function seedProfiles() {
	console.log("🌱 Seeding profiles...");
	try {
		const profiles = await readJSONFile("data/profiles/profiles.json");

		await prisma.profile.deleteMany();
		for (const profile of profiles) {
			await prisma.profile.create({
				data: {
					id: BigInt(profile.id),
					name: profile.name,
					thumb: profile.thumb || "",
					avatarPath: profile.avatarPath || "",
					backgroundPath: profile.backgroundPath || "",
					wallpaperIds: profile.wallpaperIds || [],
					nsfwAdult: profile.nsfw?.adult || [],
					nsfwRacy: profile.nsfw?.racy || [],
				},
			});
		}

		console.log(`✅ Seeded ${profiles.length} profiles`);
	} catch (error) {
		console.error("❌ Error seeding profiles:", error);
	}
}

async function seedTrackingCollections() {
	console.log("🌱 Seeding tracking collections...");
	try {
		const trackingCollections = await readJSONFile("data/tracking-collections.json");

		await prisma.trackingCollection.deleteMany();
		for (const tc of trackingCollections) {
			await prisma.trackingCollection.create({
				data: {
					collectionId: tc.collectionId,
					collectionStatus: tc.collectionStatus,
					collectionProvider: tc.collectionProvider,
					collectionTopic: tc.collectionTopic,
					collectionStyle: tc.collectionStyle,
					collectionType: tc.collectionType,
					collectionTargetId: tc.collectionTargetId,
					collectionLink: tc.collectionLink || "",
					itemsTotal: tc.itemsTotal || 0,
					createdAt: BigInt(Date.now()),
				},
			});
		}

		console.log(`✅ Seeded ${trackingCollections.length} tracking collections`);
	} catch (error) {
		console.error("❌ Error seeding tracking collections:", error);
	}
}

async function seedSeaArtCollections() {
	console.log("🌱 Seeding SeaArt collections...");
	try {
		// Clear existing data
		await prisma.seaArtCollectionItem.deleteMany();
		await prisma.seaArtCollection.deleteMany();

		const collectionsDir = path.resolve(__dirname, "../data/collections/seaart.ai/collections");
		if (!fs.existsSync(collectionsDir)) {
			console.log("📁 Collections directory not found, skipping...");
			return;
		}

		const collectionFiles = fs.readdirSync(collectionsDir).filter((f) => f.endsWith(".json"));

		for (const file of collectionFiles) {
			const filePath = path.join(collectionsDir, file);
			const collectionsData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

			for (const collection of collectionsData) {
				await prisma.seaArtCollection.create({
					data: {
						id: collection.id,
						name: collection.name,
						category: collection.category,
						trackingCollectionId: collection.tracking_collection_id,
						artworkItems: {
							create: collection.artwork_items.map((item: any) => ({
								id: item.id,
								banner: item.banner,
								bannerWidth: item.banner_width,
								bannerHeight: item.banner_height,
							})),
						},
					},
				});
			}
		}

		console.log(`✅ Seeded SeaArt collections from ${collectionFiles.length} files`);
	} catch (error) {
		console.error("❌ Error seeding SeaArt collections:", error);
	}
}

async function seed() {
	console.log("🚀 Starting comprehensive seed process...");

	// Seed core data first (categories, tags, countries)
	await seedCategories();
	await seedTags();
	await seedCountries();

	// Seed wallpapers and albums
	await seedWallpapers();
	await seedAlbums();

	// Seed profiles
	await seedProfiles();

	// Seed tracking collections
	await seedTrackingCollections();

	// Seed SeaArt collections
	await seedSeaArtCollections();

	console.log("🎉 Comprehensive seeding completed successfully!");
	await prisma.$disconnect();
}

seed().catch((e) => {
	console.error(e);
	process.exit(1);
});
