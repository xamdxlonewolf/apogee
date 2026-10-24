import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const UPSTREAM = "https://api.github.com/repos/oracle/skills/contents";
const VERSION_DIR = /^\d+\.\d+$/;

export function normalizeText(value) {
  return String(value).replace(/\r\n/g, "\n");
}

export function textHash(value) {
  return createHash("sha256").update(normalizeText(value)).digest("hex");
}

export function topReleaseVersion(text) {
  const data = JSON.parse(text);
  const version = data?.releases?.[0]?.version;
  return typeof version === "string" ? version : null;
}

export function globToRegExp(glob) {
  const pattern = glob.replace(/\\/g, "/");
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    if (char === "*" && next === "*") {
      expression += ".*";
      index += 1;
      if (pattern[index + 1] === "/") index += 1;
      continue;
    }
    if (char === "*") {
      expression += "[^/]*";
      continue;
    }
    if ("\\^$+?.()|[]{}".includes(char)) {
      expression += `\\${char}`;
      continue;
    }
    expression += char;
  }
  expression += "$";
  return new RegExp(expression);
}

export function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function matchingDenyGlob(globs, filePath) {
  const target = normalizeRepoPath(filePath);
  for (const glob of globs) {
    if (globToRegExp(glob).test(target)) return glob;
  }
  return null;
}

export function combineSides(sides) {
  if (sides.some((side) => side.status === "drifted")) {
    return { status: "drifted", continue_work: false };
  }
  if (sides.some((side) => side.status === "missing")) {
    return { status: "missing", continue_work: false };
  }
  if (sides.some((side) => side.status === "unreachable")) {
    return { status: "unreachable", continue_work: true };
  }
  return { status: "current", continue_work: true };
}

export function compareApex(local, remote) {
  if (!local?.exists) {
    return {
      status: "missing",
      facts: ["The apex skill directory has no apexlang/SKILL.md."],
    };
  }
  if (!remote) {
    return {
      status: "unreachable",
      facts: ["The apex compare did not reach https://github.com/oracle/skills main."],
    };
  }

  const facts = [];
  const localVersions = [...local.versionDirs].sort();
  const remoteVersions = [...remote.versionDirs].sort();
  if (localVersions.join() !== remoteVersions.join()) {
    facts.push(
      `apexlang version directories differ. Local has [${localVersions.join(", ")}]. Main has [${remoteVersions.join(", ")}].`,
    );
  }
  if (local.releaseVersion !== remote.releaseVersion || local.releasePath !== remote.releasePath) {
    facts.push(
      `Release notes differ. Local ${local.releasePath ?? "has no release-notes.json"} at ${local.releaseVersion ?? "no version"}. Main ${remote.releasePath} at ${remote.releaseVersion ?? "no version"}.`,
    );
  }
  if (local.skillHash !== remote.skillHash) {
    facts.push("apexlang/SKILL.md differs from main.");
  }
  if (facts.length === 0) return { status: "current", facts: [] };
  return { status: "drifted", facts };
}

export function compareDb(local, remote) {
  if (!local?.exists) {
    return {
      status: "missing",
      facts: ["The db skill directory has no SKILL.md."],
    };
  }
  if (!remote) {
    return {
      status: "unreachable",
      facts: ["The db compare did not reach https://github.com/oracle/skills main."],
    };
  }

  const facts = [];
  const localCategories = [...local.categories].sort();
  const remoteCategories = [...remote.categories].sort();
  if (localCategories.join() !== remoteCategories.join()) {
    facts.push(
      `db category directories differ. Local has [${localCategories.join(", ")}]. Main has [${remoteCategories.join(", ")}].`,
    );
  }
  if (local.skillHash !== remote.skillHash) {
    facts.push("db/SKILL.md differs from main.");
  }
  if (facts.length === 0) return { status: "current", facts: [] };
  return { status: "drifted", facts };
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function versionDirs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && VERSION_DIR.test(entry.name)).map((entry) => entry.name);
}

async function categoryDirs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
}

export async function readLocalApex(directory) {
  const apexlang = (await exists(path.join(directory, "apexlang", "SKILL.md")))
    ? path.join(directory, "apexlang")
    : directory;
  const skillPath = path.join(apexlang, "SKILL.md");
  if (!(await exists(skillPath))) return { exists: false };

  const releaseCandidates = [
    ["26.1/apexlang-generation/release-notes.json", "apex/apexlang/26.1/apexlang-generation/release-notes.json"],
    ["release-notes.json", "apex/apexlang/release-notes.json"],
  ];
  let releasePath = null;
  let releaseVersion = null;
  let releaseRepoPath = null;
  for (const [relativePath, repoPath] of releaseCandidates) {
    const candidate = path.join(apexlang, ...relativePath.split("/"));
    if (await exists(candidate)) {
      releasePath = relativePath;
      releaseRepoPath = repoPath;
      releaseVersion = topReleaseVersion(await readFile(candidate, "utf8"));
      break;
    }
  }

  return {
    exists: true,
    versionDirs: await versionDirs(apexlang),
    releasePath: releaseRepoPath,
    releaseVersion,
    skillHash: textHash(await readFile(skillPath)),
    localReleasePath: releasePath,
  };
}

export async function readLocalDb(directory) {
  const skillPath = path.join(directory, "SKILL.md");
  if (!(await exists(skillPath))) return { exists: false };
  return {
    exists: true,
    categories: await categoryDirs(directory),
    skillHash: textHash(await readFile(skillPath)),
  };
}

async function githubContents(repoPath) {
  const response = await fetch(`${UPSTREAM}/${repoPath}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "apogee-freshness",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} for ${repoPath}.`);
  }
  return response.json();
}

async function fileText(item) {
  if (item.content) return Buffer.from(item.content, "base64").toString("utf8");
  if (!item.download_url) throw new Error(`GitHub returned no content for ${item.path}.`);
  const response = await fetch(item.download_url, {
    headers: { "User-Agent": "apogee-freshness" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${item.path}.`);
  return response.text();
}

export async function readRemoteApex() {
  const listing = await githubContents("apex/apexlang");
  const skill = await githubContents("apex/apexlang/SKILL.md");
  const notesPath = "apex/apexlang/26.1/apexlang-generation/release-notes.json";
  const notes = await githubContents(notesPath);
  return {
    versionDirs: listing.filter((item) => item.type === "dir" && VERSION_DIR.test(item.name)).map((item) => item.name),
    releasePath: notesPath,
    releaseVersion: topReleaseVersion(await fileText(notes)),
    skillHash: textHash(await fileText(skill)),
  };
}

export async function readRemoteDb() {
  const listing = await githubContents("db");
  const skill = await githubContents("db/SKILL.md");
  return {
    categories: listing.filter((item) => item.type === "dir" && !item.name.startsWith(".")).map((item) => item.name),
    skillHash: textHash(await fileText(skill)),
  };
}

export async function checkFreshness({ apexDir, dbDir }) {
  const sides = [];
  const report = {};

  if (apexDir) {
    let remote = null;
    let remoteError = null;
    try {
      remote = await readRemoteApex();
    } catch (error) {
      remoteError = error;
    }
    const local = await readLocalApex(apexDir);
    const apex = remoteError && local.exists
      ? {
          status: "unreachable",
          facts: [`The apex freshness check failed. ${remoteError.message}`],
        }
      : compareApex(local, remote);
    report.apex = apex;
    sides.push(apex);
  }

  if (dbDir) {
    let remote = null;
    let remoteError = null;
    try {
      remote = await readRemoteDb();
    } catch (error) {
      remoteError = error;
    }
    const local = await readLocalDb(dbDir);
    const db = remoteError && local.exists
      ? {
          status: "unreachable",
          facts: [`The db freshness check failed. ${remoteError.message}`],
        }
      : compareDb(local, remote);
    report.db = db;
    sides.push(db);
  }

  return { ...combineSides(sides), ...report };
}

function print(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function boundaryCommand(configPath, filePath) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(configPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      print({ denied: false, glob: null });
      return 0;
    }
    process.stderr.write(`apogee.json could not be read. ${error.message}\n`);
    return 1;
  }
  if (!Array.isArray(parsed.deny_globs) || parsed.deny_globs.some((glob) => typeof glob !== "string")) {
    process.stderr.write("apogee.json deny_globs must be an array of strings.\n");
    return 1;
  }
  const glob = matchingDenyGlob(parsed.deny_globs, filePath);
  print({ denied: glob !== null, glob });
  return glob === null ? 0 : 2;
}

async function main() {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");
  const pathIndex = args.indexOf("--path");
  if (configIndex !== -1 || pathIndex !== -1) {
    if (configIndex === -1 || pathIndex === -1 || !args[configIndex + 1] || !args[pathIndex + 1]) {
      process.stderr.write("Use both --config and --path.\n");
      return 1;
    }
    return boundaryCommand(args[configIndex + 1], args[pathIndex + 1]);
  }

  const apexIndex = args.indexOf("--apex");
  const dbIndex = args.indexOf("--db");
  const apexDir = apexIndex === -1 ? null : args[apexIndex + 1];
  const dbDir = dbIndex === -1 ? null : args[dbIndex + 1];
  if (!apexDir && !dbDir) {
    process.stderr.write("Pass --apex, --db, or both.\n");
    return 1;
  }

  const result = await checkFreshness({ apexDir, dbDir });
  print(result);
  if (result.status === "drifted" || result.status === "missing") return 2;
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    });
}
