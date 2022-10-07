import { createProject } from "./create-project.js";

const cliArgs = process.argv.slice(2);
const [projectName] = cliArgs;
if (projectName) {
  await createProject(projectName);
}
