# create-ts-web-project

Quickly create a TypeScript web project.

## Usage

```sh
npm init ts-web-project <project-name>
```

## Features

- `package.json` - created and adjusted to native esm.
- `.git` and node-specific `.gitignore` - initialized in folder, and ready for first commit.
- `LICENSE` - creates an MIT license and adjusts `package.json`.
- `tsconfig.json` - strict one, with node16 module/moduleResolution.
- `"scripts"` in package.json - `start`, `build`, and `clean`.
- `src` folder - single file ready to be edited.
- `.prettierignore` and `.editorconfig` - using prettier defaults and matching IDE behavior.

## License

MIT
