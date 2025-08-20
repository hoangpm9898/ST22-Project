import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function seed() {
	// Seed profiles
	const profilesPath = path.resolve(__dirname, "../data/profiles/profiles.json");
	const profilesData = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
	await prisma.profile.deleteMany();
	for (const profile of profilesData) {
		await prisma.profile.create({
			data: {
				id: BigInt(profile.id),
				name: profile.name,
				thumb: profile.thumb,
				avatarPath: profile.avatarPath || "",
				backgroundPath: profile.backgoundPath || "",
				wallpaperIds: profile.wallpaperIds || [],
				nsfwAdult: profile.nsfw?.adult || [],
				nsfwRacy: profile.nsfw?.racy || [],
			},
		});
	}

	// Seed collections and artwork items
	const collectionsDir = path.resolve(__dirname, "../data/collections/seaart.ai/collections");
	const collectionFiles = fs.readdirSync(collectionsDir).filter((f) => f.endsWith(".json"));
	await prisma.seaArtCollectionItem.deleteMany();
	await prisma.seaArtCollection.deleteMany();
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

	console.log("Seeding complete");
	await prisma.$disconnect();
}

seed().catch((e) => {
	console.error(e);
	process.exit(1);
});
