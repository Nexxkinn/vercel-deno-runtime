import path from "path";
import { glob } from "@vercel/build-utils/dist";

export default async function gatherExtraFiles(
    globMatcher: string | string[] | undefined,
    entrypoint: string
  ) {
    if (!globMatcher) return {};
  
    console.log('gathering extra files for the fs...');
  
    const entryDir = path.dirname(entrypoint);
  
    if (Array.isArray(globMatcher)) {
      const allMatches = await Promise.all(
        globMatcher.map(pattern => glob(pattern, entryDir))
      );
  
      return allMatches.reduce((acc, matches) => ({ ...acc, ...matches }), {});
    }
  
    return glob(globMatcher, entryDir);
  }