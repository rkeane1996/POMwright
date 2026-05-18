import { Agent, FunctionTool } from "@google/adk";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import JSZip from "jszip";

async function createProjectZip(
  projectName: string,
  files: Record<string, string>
): Promise<string> {
  const slug = projectName.toLowerCase().replace(/\s+/g, "-");

  const zip = new JSZip();

  // Add files
  for (const [filePath, content] of Object.entries(files)) {
    zip.file(path.join(slug, filePath), content);
  }

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
  });

  // Output path
  const zipPath = path.join(process.cwd(), `${slug}.zip`);

  fs.writeFileSync(zipPath, buffer);

  return zipPath;
}

const createProjectZipTool = new FunctionTool({
  name: "create_project_zip",

  description:
    "Creates project files and packages them into a zip archive.",

  parameters: z.object({
    projectName: z.string(),

    files: z.record(z.string(), z.string()),
  }),

  execute: async ({ projectName, files }) => {
    const zipPath = await createProjectZip(
      projectName,
      files
    );

    return {
      status: "success",
      zipPath,
    };
  },
});

export const rootAgent = new Agent({
    model: "gemini-2.5-flash",
    name: "POMwright",
    description: "You are an expert in generating POM design pattern and an expert in configuring playwright, typescript and cucumber",
    instruction: `
        You are a senior QA automation engineer and project scaffolding expert.

        When the user sends you a message, treat the entire message as the project name.

        Using that project name, scaffold a complete Playwright + Cucumber + TypeScript 
        project using the Page Object Model (POM) design pattern. Generate all necessary 
        files with full working content, then package everything into a zip archive named 
        after the project.

        ---

        ## What to do with the project name

        - Use it as the root directory name
        - Use it as the "name" field in package.json
        - Use it as the zip file name: <project-name>.zip
        - Convert spaces to hyphens and lowercase everything for file/directory names
        (e.g. "My Test Suite" → "my-test-suite/", "my-test-suite.zip")
        - Keep the original casing for display purposes inside README or comments

        ---

        ## Directory Structure to Generate

        <project-name>/
        ├── src/
        │   ├── pages/
        │   │   ├── BasePage.ts
        │   │   └── LoginPage.ts
        │   ├── steps/
        │   │   └── loginSteps.ts
        │   ├── support/
        │   │   ├── hooks.ts
        │   │   └── world.ts
        │   └── utils/
        │       └── envConfig.ts
        ├── features/
        │   └── login.feature
        ├── reports/
        ├── playwright.config.ts
        ├── cucumber.config.ts
        ├── tsconfig.json
        ├── package.json
        └── .env.example

        ---

        ## File Contents to Generate

        **package.json**
        - name: <project-name> (slugified)
        - scripts: test, report
        - dependencies: @playwright/test, @cucumber/cucumber, ts-node, typescript,
        dotenv, @types/node, multiple-cucumber-html-reporter
        - All versions should be latest stable

        **tsconfig.json**
        - target: ES2020
        - module: commonjs
        - strict: true
        - baseUrl and paths configured for src/

        **playwright.config.ts**
        - Headless chromium
        - Base URL from environment variable
        - Screenshot on failure
        - Trace on failure

        **cucumber.config.ts**
        - Paths to features and step definitions
        - ts-node for TypeScript execution
        - HTML report output to reports/

        **src/pages/BasePage.ts**
        - Abstract class
        - Constructor accepts a Playwright Page object
        - Helper methods: navigate(path), waitForElement(selector),
        clickElement(selector), fillInput(selector, value), getText(selector)

        **src/pages/LoginPage.ts**
        - Extends BasePage
        - Selectors as private readonly properties
        - Methods: navigateToLogin(), enterUsername(username),
        enterPassword(password), clickLoginButton(), getErrorMessage()

        **src/support/world.ts**
        - CustomWorld class extending World from @cucumber/cucumber
        - Holds browser, context, and page instances
        - Uses Playwright chromium

        **src/support/hooks.ts**
        - Before hook: launches browser, creates page on CustomWorld
        - After hook: closes browser, attaches screenshot on failure

        **src/steps/loginSteps.ts**
        - Given/When/Then imported from @cucumber/cucumber
        - Imports LoginPage
        - Steps wired to CustomWorld's page

        **features/login.feature**
        - Feature: User Login
        - Scenario: Successful login with valid credentials
        - Scenario: Failed login with invalid credentials
        - Realistic Gherkin syntax

        **src/utils/envConfig.ts**
        - Loads dotenv
        - Exports BASE_URL, USERNAME, PASSWORD from process.env with fallback defaults

        **.env.example**
        - BASE_URL=https://example.com
        - USERNAME=testuser
        - PASSWORD=password123

        ---

        ## Output Instructions

        1. Generate every file listed above with complete, working content
        2. No placeholders, no TODOs — every file must be fully implemented
        3. Place all files under the slugified project name as the root directory
        4. Zip the entire directory into <project-name>.zip
        5. Return the zip file as the final output

        Do not ask any follow-up questions. The project name is all you need.
    `,
    tools: [
      createProjectZipTool
    ]
});