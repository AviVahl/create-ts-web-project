import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  amendPackageJson,
  editorConfigContent,
  generateReadme,
  npmRcContent,
  prettierIgnoreContent,
  srcMainContent,
  tscInitOptions,
} from "./helpers.js";

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
  spawnCommand("npm", ["install", "-D", "typescript", "express"]);

  console.log(`Creating tsconfig.json`);
  spawnCommand("npx", ["tsc", "--init", ...tscInitOptions]);

  console.log(`Amending package.json`);
  const packageJsonPath = join(projectPath, "package.json");
  const originalPackageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8")
  );
  const newPackageJson = amendPackageJson(originalPackageJson);
  await writeFile(
    packageJsonPath,
    JSON.stringify(newPackageJson, null, 2) + "\n"
  );
  console.log(`Reinstalling deps post package.json change`);
  spawnCommand("npm", ["install"]);

  console.log(`Creating src folder`);
  const srcPath = join(projectPath, "src");
  await mkdir(srcPath);
  await writeFile(join(srcPath, "main.ts"), srcMainContent);

  console.log(`Writing .prettierignore`);
  await writeFile(join(projectPath, ".prettierignore"), prettierIgnoreContent);

  console.log(`Writing .npmrc`);
  await writeFile(join(projectPath, ".npmrc"), npmRcContent);

  console.log(`Creating README`);
  await writeFile(join(projectPath, "README.md"), generateReadme(projectName));

  console.log(`Initializing scripts`);
  const scriptsPath = join(projectPath, "scripts");
  await mkdir(scriptsPath);
  for (const fileName of ["clean.js", "start.js"]) {
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

  console.log(`Adding and commiting to git`);
  spawnCommand("git", ["add", "."]);
  spawnCommand("git", ["commit", "-m", `"Initialize project."`]);
}
