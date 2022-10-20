import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function createProject(projectName: string) {
  const projectPath = join(process.cwd(), projectName);
  if (existsSync(projectPath)) {
    console.error(`${projectPath} already exists!`);
    return;
  }
  console.log(`Creating ${projectPath}`);
  await mkdir(projectPath, { recursive: true });
  const spawnOptions = {
    shell: true,
    cwd: projectPath,
    encoding: "utf8",
  } as const;

  function spawnCommand(command: string, args: readonly string[]) {
    const { output, status } = spawnSync(command, args, spawnOptions);
    if (status !== 0) {
      console.log(output.filter((v) => !!v).join("\n"));
      throw new Error(
        `Command "${command} ${args.join(" ")}" failed with exit code ${String(
          status
        )}.`
      );
    }
  }

  console.log(`Initializing git`);
  spawnCommand("git", ["init"]);

  console.log(`Creating package.json`);
  spawnCommand("npm", ["init", "-y"]);

  console.log(`Fetching node-specific .gitignore`);
  spawnCommand("npx", ["gitignore", "node"]);

  console.log(`Setting MIT license`);
  spawnCommand("npx", ["license", "MIT"]);

  console.log(`Installing dev dependencies`);
  spawnCommand("npm", ["install", "-D", "typescript", "express", "ws"]);

  console.log(`Creating tsconfig.json`);
  spawnCommand("npx", ["tsc", "--init", ...tscInitOptions]);

  console.log(`Amending package.json`);
  const packageJsonPath = join(projectPath, "package.json");
  await amendPackageJson(packageJsonPath);

  console.log(`Reinstalling deps post package.json change`);
  spawnCommand("npm", ["install"]);

  console.log(`Creating src folder`);
  await createSrcFolder(projectPath);

  console.log(`Writing .prettierignore`);
  await writeFile(join(projectPath, ".prettierignore"), prettierIgnoreContent);

  console.log(`Writing .npmrc`);
  await writeFile(join(projectPath, ".npmrc"), npmRcContent);

  console.log(`Creating README`);
  await createReadme(join(projectPath, "README.md"), projectName);

  console.log(`Initializing scripts`);
  const scriptsPath = join(projectPath, "scripts");
  await mkdir(scriptsPath);
  for (const fileName of ["clean.js", "dev-server.js", "start.js"]) {
    await copyFile(
      new URL(`../template/scripts/${fileName}`, import.meta.url),
      join(scriptsPath, fileName)
    );
  }

  console.log(`Creating index.html`);
  await copyFile(
    new URL(`../template/index.html`, import.meta.url),
    join(projectPath, "index.html")
  );

  console.log(`Creating .editorconfig`);
  await writeFile(join(projectPath, ".editorconfig"), editorConfigContent);
}

const tscInitOptions = [
  "--target",
  "es2022",
  "--lib",
  "es2022,dom",
  "--module",
  "node16",
  "--moduleResolution",
  "node16",
  "--types",
  " ",
  "--sourceMap",
  "--importsNotUsedAsValues",
  "error",
  "--skipLibCheck",
  "false",
  "--skipDefaultLibCheck",
  "--noUnusedLocals",
  "--noUnusedParameters",
  "--exactOptionalPropertyTypes",
  "--noImplicitReturns",
  "--noFallthroughCasesInSwitch",
  "--noUncheckedIndexedAccess",
  "--noImplicitOverride",
  "--noPropertyAccessFromIndexSignature",
  "--newLine",
  "lf",
  "--outDir",
  "./dist",
];

const srcMainContent = `document.body.appendChild(document.createTextNode("Hello World"));\n`;
const prettierIgnoreContent = ["dist", "tsconfig.json", ""].join("\n");
const npmRcContent = `engine-strict=true\n`;

async function createReadme(readmePath: string, projectName: string) {
  const readmeContent = [
    `# ${projectName}`,
    "",
    "web project.",
    "",
    "### License",
    "",
    "MIT",
    "",
  ].join("\n");
  await writeFile(readmePath, readmeContent);
}

async function createSrcFolder(projectPath: string) {
  const srcPath = join(projectPath, "src");
  await mkdir(srcPath);
  await writeFile(join(srcPath, "main.ts"), srcMainContent);
}

interface PackageJson {
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
async function amendPackageJson(packageJsonPath: string) {
  const packageJson: PackageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8")
  );

  packageJson.devDependencies["typescript"] =
    "~" + packageJson.devDependencies["typescript"]!.slice(1);

  const newPackageJson: PackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    description: "Web Project",
    type: "module",
    main: undefined,
    scripts: {
      clean: "node scripts/clean.js",
      build: "tsc",
      watch: "npm run build -- -w",
      start: "node scripts/start.js",
    },
    devDependencies: packageJson.devDependencies,
    prettier: {},
    engines: {
      node: ">=16",
      npm: ">=8",
    },
  };

  for (const [key, value] of Object.entries(packageJson)) {
    if (!(key in newPackageJson)) {
      (newPackageJson as unknown as Record<string, unknown>)[key] = value;
    }
  }
  await writeFile(
    packageJsonPath,
    JSON.stringify(newPackageJson, null, 2) + "\n"
  );
}

const editorConfigContent = [
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
