import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  amendPackageJson,
  editorConfigContent,
  generateReadme,
  npmRcContent,
  prettierIgnoreContent,
  srcMainContent,
  tscInitOptions,
} from "./helpers.js";

const templateURL = new URL(`../template/`, import.meta.url);
const templateScriptsURL = new URL("scripts/", templateURL);

export async function createProject(projectName: string) {
  const projectURL = new URL(
    projectName + "/",
    pathToFileURL(process.cwd() + sep)
  );
  if (existsSync(projectURL)) {
    console.error(`${projectURL} already exists!`);
    return;
  }
  console.log(`Creating ${fileURLToPath(projectURL)}`);
  await mkdir(projectURL, { recursive: true });
  const spawnOptions = {
    shell: true,
    cwd: projectURL,
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
  const projectPackageJsonURL = new URL("package.json", projectURL);
  const originalPackageJson = JSON.parse(
    await readFile(projectPackageJsonURL, "utf8")
  );
  const newPackageJson = amendPackageJson(originalPackageJson);
  await writeFile(
    projectPackageJsonURL,
    JSON.stringify(newPackageJson, null, 2) + "\n"
  );
  console.log(`Reinstalling deps post package.json change`);
  spawnCommand("npm", ["install"]);

  console.log(`Creating src folder`);
  const projectSrcURL = new URL("src/", projectURL);
  await mkdir(projectSrcURL);
  await writeFile(new URL("main.ts", projectSrcURL), srcMainContent);

  console.log(`Writing .prettierignore`);
  await writeFile(
    new URL(".prettierignore", projectURL),
    prettierIgnoreContent
  );

  console.log(`Writing .npmrc`);
  await writeFile(new URL(".npmrc", projectURL), npmRcContent);

  console.log(`Creating README`);
  await writeFile(
    new URL("README.md", projectURL),
    generateReadme(projectName)
  );

  console.log(`Initializing scripts`);
  const projectScriptsURL = new URL("scripts/", projectURL);
  await mkdir(projectScriptsURL);
  for (const fileName of await readdir(templateScriptsURL)) {
    await copyFile(
      new URL(fileName, templateScriptsURL),
      new URL(fileName, projectScriptsURL)
    );
  }

  console.log(`Creating index.html`);
  await copyFile(
    new URL(`index.html`, templateURL),
    new URL("index.html", projectURL)
  );

  console.log(`Creating .editorconfig`);
  await writeFile(new URL(".editorconfig", projectURL), editorConfigContent);

  console.log(`Adding and commiting to git`);
  spawnCommand("git", ["add", "."]);
  spawnCommand("git", ["commit", "-m", `"Initialize project."`]);
}
