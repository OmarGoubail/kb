import { Database } from "bun:sqlite";

export function openDatabase(dbPath: string): Database {
	const db = new Database(dbPath, { create: true });

	// Enable WAL mode for better concurrent read performance
	db.run("PRAGMA journal_mode=WAL");
	db.run("PRAGMA foreign_keys=ON");

	return db;
}
