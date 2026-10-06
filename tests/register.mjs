// Lets plain Node load the app's modules the way Next.js does: imports
// without a ".js" ending, and JSON files. Used by `npm test`.
import { register } from "node:module";
register(new URL("./loader.mjs", import.meta.url));
