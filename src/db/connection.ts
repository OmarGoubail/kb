import { Database } from "bun:sqlite";

export function openDatabase(dbPath: string): Database {
	const db = new Database(dbPath, { create: true });

	// Enable WAL mode for better concurrent read performance
	db.run("PRAGMA journal_mode=WAL");
	db.run("PRAGMA foreign_keys=ON");
	// Retry for up to 5s if another process holds the write lock
	db.run("PRAGMA busy_timeout=5000");

	return db;
}
