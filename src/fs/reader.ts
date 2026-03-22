import { existsSync, readFileSync, readdirSync } from "node:fs";

export function fileExists(path: string): boolean {
	return existsSync(path);
}

export function readFile(path: string): string {
	return readFileSync(path, "utf-8");
}

export function readDir(path: string): string[] {
	if (!existsSync(path)) return [];
	return readdirSync(path);
}

export function listMarkdownFiles(dirPath: string): string[] {
	return readDir(dirPath).filter((f) => f.endsWith(".md") && !f.startsWith("."));
}
