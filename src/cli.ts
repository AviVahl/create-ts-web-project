import { createProject } from "./create-project.ts";

const cliArgs = process.argv.slice(2);
const [projectName] = cliArgs;
if (projectName) {
  await createProject(projectName);
}
