export interface PackageJson {
  name: string;
  main?: string | undefined;
  version: string;
  type: string;
  description: string;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  prettier: Record<string, string>;
  engines: Record<string, string>;
}
export function amendPackageJson(packageJson: PackageJson): PackageJson {
  const newPackageJson: PackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    description: "Web Project",
    type: "module",
    scripts: {
      clean: "node scripts/clean.js",
      build: "tsc",
      watch: "npm run build -- -w",
      start: "node scripts/start.js",
    },
    devDependencies: { ...packageJson.devDependencies },
    prettier: {},
    engines: {
      node: ">=22",
      npm: ">=10",
    },
  };

  newPackageJson.devDependencies["typescript"] =
    "~" + newPackageJson.devDependencies["typescript"]!.slice(1);

  for (const [key, value] of Object.entries(packageJson)) {
    if (!(key in newPackageJson) && key !== "main") {
      newPackageJson[key as keyof PackageJson] = value;
    }
  }

  return newPackageJson;
}

export function generateReadme(projectName: string) {
  return [
    `# ${projectName}`,
    "",
    "web project.",
    "",
    "### License",
    "",
    "MIT",
    "",
  ].join("\n");
}

export const editorConfigContent = [
  "root = true",
  "",
  "[*]",
  "indent_style = space",
  "indent_size = 2",
  "charset = utf-8",
  "trim_trailing_whitespace = true",
  "insert_final_newline = true",
  "",
].join("\n");

export const tscInitOptions = [
  "--target",
  "es2023",
  "--lib",
  "es2023,dom",
  "--module",
  "node16",
  "--moduleResolution",
  "node16",
  "--types",
  " ",
  "--sourceMap",
  "--verbatimModuleSyntax",
  "--skipLibCheck",
  "false",
  "--noUncheckedIndexedAccess",
  "--isolatedModules",
  "--erasableSyntaxOnly",
  "--newLine",
  "lf",
  "--outDir",
  "./dist",
];

export const srcMainContent = `document.body.appendChild(document.createTextNode("Hello World"));\n`;
export const prettierIgnoreContent = ["dist", "tsconfig.json", ""].join("\n");
export const npmRcContent = `engine-strict=true\n`;
