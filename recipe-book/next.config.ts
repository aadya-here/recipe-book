import type { NextConfig } from "next";

const {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} = require("next/constants");

/** @type {(phase: string, defaultConfig: import("next").NextConfig) => Promise<import("next").NextConfig>} */
module.exports = async (phase) => {
  /** @type {import("next").NextConfig} */
  const nextConfig = {};

  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    // This is optional!
    // A revision helps Serwist version a precached page. This
    // avoids outdated precached responses being used. Using
    // `git rev-parse HEAD` might not the most efficient way
    // of determining a revision, however. You may prefer to use
    // the hashes of every extra file you precache.
    const { spawnSync } = require("node:child_process");
    const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout ?? crypto.randomUUID();

    const withSerwist = (await import("@serwist/next")).default({
      additionalPrecacheEntries: [{ url: "/~offline", revision }],
      // Note: This is only an example. If you use Pages Router,
      // use something else that works, such as "service-worker/index.ts".
      swSrc: "app/sw.ts",
      swDest: "public/sw.js",
    });
    return withSerwist(nextConfig);
  }

  return nextConfig;
};
