export class Base64Helper {
	static encode(data: any): string {
		let str: string;
		if (typeof data === "string") str = data;
		else {
			try {
				str = JSON.stringify(data);
			} catch (e) {
				throw new Error("Unable to convert input to string for Base64 encoding.");
			}
		}
		if (typeof window === "undefined") return Buffer.from(str, "utf-8").toString("base64");
		else {
			return btoa(
				encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))),
			);
		}
	}

	static decode<T = any>(base64: any): T | string {
		if (typeof base64 !== "string") throw new Error("Input to base64Decode must be a base64 string.");
		let decoded: string;
		if (typeof window === "undefined") decoded = Buffer.from(base64, "base64").toString("utf-8");
		else {
			decoded = decodeURIComponent(
				Array.prototype.map
					.call(atob(base64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
					.join(""),
			);
		}
		try {
			return JSON.parse(decoded) as T;
		} catch {
			return decoded; // If not JSON, return raw string
		}
	}
}
