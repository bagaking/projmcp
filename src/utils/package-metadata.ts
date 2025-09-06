import { readFileSync } from 'fs';

export interface PackageMetadata {
  name: string;
  version: string;
}

function readPackageMetadata(): PackageMetadata {
  const packageJson = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  ) as Partial<PackageMetadata>;

  if (typeof packageJson.name !== 'string' || packageJson.name.trim().length === 0) {
    throw new Error('package.json must define a package name');
  }

  if (typeof packageJson.version !== 'string' || packageJson.version.trim().length === 0) {
    throw new Error('package.json must define a package version');
  }

  return {
    name: packageJson.name,
    version: packageJson.version
  };
}

export const PACKAGE_METADATA = readPackageMetadata();
