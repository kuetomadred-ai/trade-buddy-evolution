import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(".output/public/plotos");
const destination = resolve("dist");
const entryPoint = resolve(source, "index.html");

if (!existsSync(entryPoint)) {
  throw new Error(`PLOTOS web assets were not found at ${source}. Run the web build first.`);
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true });

console.log(`Prepared Capacitor web assets in ${destination}`);
