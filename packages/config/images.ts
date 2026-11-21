import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface Manifest {
  readonly name: string;
  readonly dependencies?: Readonly<Record<string, string>>;
}

interface WorkspacePackage {
  readonly dir: string;
  readonly manifest: Manifest;
}

function manifestOf(dir: string): Manifest {
  return JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as Manifest;
}

/** The app and the packages of the workspace it needs at run time: its production dependencies, and theirs. */
function runtimePackagesOf(root: string, appDir: string): WorkspacePackage[] {
  const packages = new Map<string, WorkspacePackage>();
  for (const name of readdirSync(path.join(root, 'packages'))) {
    const dir = `packages/${name}`;
    if (!existsSync(path.join(root, dir, 'package.json'))) continue;
    const manifest = manifestOf(path.join(root, dir));
    packages.set(manifest.name, { dir, manifest });
  }
  const app = { dir: appDir, manifest: manifestOf(path.join(root, appDir)) };
  const needed = new Map<string, WorkspacePackage>([[app.manifest.name, app]]);
  const visit = ({ manifest }: WorkspacePackage): void => {
    for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
      const found = packages.get(name);
      if (!version.startsWith('workspace:') || !found || needed.has(name)) continue;
      needed.set(name, found);
      visit(found);
    }
  };
  visit(app);
  return [...needed.values()];
}

/**
 * What the Dockerfile of an app leaves out of its image, as the COPY lines it is missing. Node runs
 * the sources of the workspace as they are, so the image needs, of the app and of every package it
 * needs at run time: the manifest in the stage that installs, and the manifest, the sources and,
 * if it has production dependencies, the node_modules in the last stage, the one that runs.
 */
export function missingFromImage(root: string, appDir: string): string[] {
  const stages = readFileSync(path.join(root, appDir, 'Dockerfile'), 'utf8').split(/^FROM /m);
  const install = stages[1] ?? '';
  const runtime = stages.at(-1) ?? '';
  const missing: string[] = [];
  for (const { dir, manifest } of runtimePackagesOf(root, appDir)) {
    const lines: [string, string][] = [
      [install, `COPY ${dir}/package.json ${dir}/`],
      [runtime, `COPY ${dir}/package.json ${dir}/`],
      [runtime, `COPY ${dir}/src ${dir}/src`],
    ];
    if (Object.keys(manifest.dependencies ?? {}).length > 0) {
      lines.push([runtime, `COPY --from=install /app/${dir}/node_modules ${dir}/node_modules`]);
    }
    for (const [stage, line] of lines) {
      if (!stage.includes(line)) missing.push(line);
    }
  }
  return missing;
}
