/**
 * Applies zod/v3 + zod/v4 export shims to Zod 3.x installs that @ai-sdk/provider-utils requires.
 * Run after `pnpm install` if patchedDependencies did not apply (or lock still resolves Zod 3).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SHIM_FILES = {
  "lib/v3.js": `"use strict";\nmodule.exports = require('./index.js');\n`,
  "lib/v3.mjs": `export * from "./index.mjs";\nexport { default } from "./index.mjs";\n`,
  "lib/v4.js": `"use strict";
const original = require('./index.js');

module.exports = {
    ...original,
    safeParseAsync: (schema, data, params) => schema.safeParseAsync(data, params),
    parse: (schema, data, params) => schema.parse(data, params),
    parseAsync: (schema, data, params) => schema.parseAsync(data, params),
    $ZodError: original.ZodError,
    toJSONSchema: (schema) => {
        if (schema && schema._def) {
            return { type: "object", description: "Zod 3 schema (v4 compatibility layer)" };
        }
        return {};
    }
};
`,
  "lib/v4.mjs": `import * as zod from "./index.mjs";
export * from "./index.mjs";
export const {
    default: ZodDefault,
    z,
    ZodType,
    ZodSchema,
    ZodError,
    ZodFirstPartyTypeKind,
} = zod;
export default zod.default;

export const safeParseAsync = (schema, data, params) => schema.safeParseAsync(data, params);
export const parse = (schema, data, params) => schema.parse(data, params);
export const parseAsync = (schema, data, params) => schema.parseAsync(data, params);
export const $ZodError = ZodError;
export const toJSONSchema = (schema) => {
    if (schema && schema._def) {
        return { type: "object", description: "Zod 3 schema (v4 compatibility layer)" };
    }
    return {};
};
`,
};

const EXPORT_ENTRIES = {
  "./v3": {
    types: "./index.d.ts",
    require: "./lib/v3.js",
    import: "./lib/v3.mjs",
  },
  "./v4": {
    types: "./index.d.ts",
    require: "./lib/v4.js",
    import: "./lib/v4.mjs",
  },
  "./v4/core": {
    types: "./index.d.ts",
    require: "./lib/v4.js",
    import: "./lib/v4.mjs",
  },
};

function findZodPackageDirs(rootDir) {
  const results = [];
  const pnpmDir = path.join(rootDir, "node_modules", ".pnpm");
  if (!fs.existsSync(pnpmDir)) {
    const direct = path.join(rootDir, "node_modules", "zod");
    if (fs.existsSync(path.join(direct, "package.json"))) results.push(direct);
    return results;
  }

  for (const entry of fs.readdirSync(pnpmDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(pnpmDir, entry.name, "node_modules", "zod");
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      results.push(candidate);
    }
  }

  const hoisted = path.join(rootDir, "node_modules", "zod");
  if (fs.existsSync(path.join(hoisted, "package.json")) && !results.includes(hoisted)) {
    results.push(hoisted);
  }

  return results;
}

function needsShim(zodDir) {
  const pkgPath = path.join(zodDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (!pkg.version?.startsWith("3.")) return false;
  return !pkg.exports?.["./v4"];
}

function applyShim(zodDir) {
  for (const [rel, content] of Object.entries(SHIM_FILES)) {
    fs.writeFileSync(path.join(zodDir, rel), content, "utf8");
  }

  const pkgPath = path.join(zodDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.exports = pkg.exports ?? {};
  for (const [key, value] of Object.entries(EXPORT_ENTRIES)) {
    pkg.exports[key] = value;
  }
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

let patched = 0;
for (const zodDir of findZodPackageDirs(repoRoot)) {
  if (!needsShim(zodDir)) continue;
  applyShim(zodDir);
  patched += 1;
  console.log(`[ensure-zod-v4-exports] Patched ${zodDir}`);
}

if (patched === 0) {
  console.log("[ensure-zod-v4-exports] All Zod installs already expose zod/v4 (or use Zod 4).");
} else {
  console.log(`[ensure-zod-v4-exports] Patched ${patched} Zod 3.x package(s).`);
}
