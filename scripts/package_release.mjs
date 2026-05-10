import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = join("release", "web3_skeleton");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "RELEASE_NOTE.txt"), "TransferIDS SENTINEL-X web3 skeleton package placeholder.\n");
console.log(`Release note written to ${out}`);

