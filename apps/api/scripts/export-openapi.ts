import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenApiSpec } from '../src/openapi/spec.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist');
const outFile = join(outDir, 'openapi.json');

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(buildOpenApiSpec(), null, 2), 'utf8');
console.log(`[openapi] Spec exportada → ${outFile}`);
