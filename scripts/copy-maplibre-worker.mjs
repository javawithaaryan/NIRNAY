import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "node_modules", "maplibre-gl", "dist");
const target = path.join(root, "public", "maplibre");
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

await mkdir(target, { recursive: true });
for (const file of files) {
  await copyFile(path.join(source, file), path.join(target, file));
}
console.log(`copied ${files.join(", ")} to public/maplibre/`);
