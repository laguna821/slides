import fs from 'node:fs/promises';
import {builtReviewRoutes,releaseManifest,releaseDigest} from './release-gate';
await fs.writeFile('../validation/portfolio-review-input.json',JSON.stringify({routes:await builtReviewRoutes(),digest:await releaseDigest(),sourceFiles:await releaseManifest()},null,2));
console.log(await builtReviewRoutes());
