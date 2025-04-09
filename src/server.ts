import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as yaml from 'js-yaml';
import { PEConfig } from './types.js';
import { GitHubClient } from './github.js';

// GitHub authentication environment variables
const GITHUB_PAT: string = process.env.GITHUB_PAT || '';
const GITHUB_APP_ID: string = process.env.GITHUB_APP_ID || '';
const GITHUB_PRIVATE_KEY: string = process.env.GITHUB_PRIVATE_KEY || '';
const GITHUB_INSTALLATION_ID: string = process.env.GITHUB_INSTALLATION_ID || '';
const PE_CONFIG_REPO: string = process.env.PE_CONFIG_REPO || ''; // format: owner/repo
const PE_CONFIG_PATH: string = process.env.PE_CONFIG_PATH || 'pe.yaml';
const DEVCENTER_NAME = process.env.DEVCENTER_NAME || '';

// Validate required environment variables
if (!PE_CONFIG_REPO) {
  console.error('Missing required environment variable: PE_CONFIG_REPO');
  process.exit(1);
}

if (!GITHUB_PAT && (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY || !GITHUB_INSTALLATION_ID)) {
  console.error('Missing required environment variables: either GITHUB_PAT or all GitHub App credentials (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_INSTALLATION_ID) must be provided');
  process.exit(1);
}

// Initialize GitHub client with either PAT or GitHub App credentials
const githubClient = new GitHubClient({
  pat: GITHUB_PAT || undefined,
  appId: GITHUB_APP_ID,
  privateKey: GITHUB_PRIVATE_KEY,
  installationId: GITHUB_INSTALLATION_ID,
});

// Load PE configuration from GitHub repository
async function loadPEConfig(): Promise<PEConfig> {
  try {
    const [owner, repo] = PE_CONFIG_REPO.split('/');
    const content = await githubClient.getConfigFile(owner, repo, PE_CONFIG_PATH);
    return yaml.load(content) as PEConfig;
  } catch (error) {
    console.error('Error loading PE configuration from GitHub:', error);
    return {
      sources: {
        github_workflow_orgs: [],
        github_repository_templates: []
      }
    };
  }
}

// Create an MCP server
const server = new McpServer({
  name: "Platform Engineering Copilot",
  version: "1.0.0"
});

// Add create-project prompt to guide through project creation
server.prompt(
  "create-project",
  "Guide through creating a new project with standardized templates and workflows",
  {
    language: z.string().optional(),
    framework: z.string().optional(),
    architectureType: z.string().optional(),
    features: z.string().optional(),
    compliance: z.string().optional(),
    complexity: z.string().optional(),
    needsTestEnv: z.string().optional()
  },
  async ({ language, framework, architectureType, features, compliance, complexity, needsTestEnv }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Help me create a new project by following these steps:

          1. Gather Requirements:
            - Review provided parameters (language: ${language || 'unspecified'}, framework: ${framework || 'unspecified'})
            - If any key parameters are missing, such as language or framework, ask the user for clarification

          2. Find Repository Template:
            - Use get-repository-templates tool to find matching templates
            - Filter by language, framework, architecture type if specified
            - Consider features (${features || 'none specified'}) and compliance (${compliance || 'none specified'})
            - Review options and recommend best match to user

          3. Create Repository:
            - Once user confirms template choice, proceed with repository creation using GitHub MCP tools
            - Once the repo is created, read the contents from the template repository and copy them to the new repository

          4. Setup CI/CD:
            - Use get-github-actions-templates tool to find workflow templates
            - Recommend appropriate workflows based on project type
            - Once the user confirms the template choice, create a workflow in the new repository copying the template contents

          5. Final Steps:
            - Summarize all actions taken
            - Provide next steps and resources to the user`
      }
    }]
  })
);

// Load the PE configuration
const peConfig = await loadPEConfig();

// Tool 1: Get available repository templates with optional filters
server.tool("get-repository-templates", 
  `Retrieve and filter standardized repository templates based on project requirements.

PURPOSE:
- Find organization-approved repository templates for new projects
- Filter templates based on technical and compliance requirements
- Access pre-configured project structures with best practices
- Match templates to specific project needs and constraints

CAPABILITIES:
- Filters templates by programming language
- Filters by framework or library requirements
- Matches architectural patterns (e.g., microservices, monolith)
- Finds templates with specific features or capabilities
- Filters by compliance requirements (e.g., HIPAA, SOC2)
- Matches complexity levels for different project scales

LIMITATIONS:
- Only returns templates from pre-configured template repositories
- Cannot create or modify templates directly
- Cannot validate template compatibility with specific environments
- Filters are case-insensitive exact matches only

USE WHEN:
- Starting new development projects
- Ensuring compliance with organizational standards
- Implementing standardized project structures
- Selecting templates based on technical requirements`, {
    language: z.string().optional(),
    framework: z.string().optional(),
    architectureType: z.string().optional(),
    feature: z.string().optional(),
    compliance: z.string().optional(),
    complexity: z.string().optional()
  },
  async (params) => {
    let templates = peConfig.sources.github_repository_templates;

    // Apply filters if provided
    if (params.language) {
      templates = templates.filter(t => 
        t.metadata.language.toLowerCase() === params.language?.toLowerCase());
    }
    
    if (params.framework) {
      templates = templates.filter(t => 
        t.metadata.framework.toLowerCase() === params.framework?.toLowerCase());
    }
    
    if (params.architectureType) {
      templates = templates.filter(t => 
        t.metadata.architectureType.toLowerCase() === params.architectureType?.toLowerCase());
    }
    
    if (params.feature) {
      templates = templates.filter(t => 
        t.metadata.features.some(f => f.toLowerCase() === params.feature?.toLowerCase()));
    }
    
    if (params.compliance) {
      templates = templates.filter(t => 
        t.metadata.compliance.some(c => c.toLowerCase() === params.compliance?.toLowerCase()));
    }
    
    if (params.complexity) {
      templates = templates.filter(t => 
        t.metadata.complexity.toLowerCase() === params.complexity?.toLowerCase());
    }

    // Format the results
    const formattedTemplates = templates.map(t => ({
      name: t.name,
      url: t.url,
      description: t.description,
      language: t.metadata.language,
      framework: t.metadata.framework,
      architectureType: t.metadata.architectureType,
      features: t.metadata.features.join(", "),
      compliance: t.metadata.compliance.join(", "),
      useCases: t.metadata["use-cases"].join(", "),
      complexity: t.metadata.complexity
    }));

    return {
      content: [
        { 
          type: "text", 
          text: templates.length > 0 
            ? `Found ${templates.length} matching repository templates:\n\n${JSON.stringify(formattedTemplates, null, 2)}`
            : "No repository templates found matching the provided filters."
        }
      ]
    };
  }
);

// Tool 2: Get available GitHub Actions templates with optional filters
server.tool("get-github-actions-templates",
  `Retrieve and filter GitHub Actions workflow templates from configured workflow organizations.

PURPOSE:
- Find standardized CI/CD workflow templates for your repositories
- Discover organization-specific workflow patterns and best practices
- Access pre-configured GitHub Actions templates for common use cases

CAPABILITIES:
- Lists all available workflow template organizations
- Filters templates by organization name
- Returns template URLs, descriptions, and metadata
- Provides direct links to workflow template files

LIMITATIONS:
- Only returns templates from pre-configured workflow organizations
- Does not create or modify workflow files directly
- Cannot validate workflow compatibility with specific repositories
- Organization filter is case-insensitive partial match only

USE WHEN:
- Setting up new CI/CD pipelines
- Standardizing workflow patterns across repositories
- Finding organization-approved workflow templates
- Implementing best practices for GitHub Actions`, {
    organization: z.string().optional()
  },
  async (params) => {
    let workflowOrgs = peConfig.sources.github_workflow_orgs;
    
    // Filter by organization if provided
    if (params.organization) {
      workflowOrgs = workflowOrgs.filter(org => 
        org.name.toLowerCase().includes(params.organization?.toLowerCase() || ''));
    }

    // Format the results
    const formattedOrgs = workflowOrgs.map(org => ({
      name: org.name,
      url: org.url,
      description: org.description,
      workflowsUrl: `${org.url}/.github/workflow-templates`
    }));

    return {
      content: [
        { 
          type: "text", 
          text: workflowOrgs.length > 0 
            ? `Found ${workflowOrgs.length} GitHub organizations with workflow templates:\n\n${JSON.stringify(formattedOrgs, null, 2)}`
            : "No GitHub organizations found matching the provided filters."
        }
      ]
    };
  }
);

// Tool 3: Create a new repository from a template
server.tool("create-repository-from-template",
  `Create a new GitHub repository using a template repository.

PURPOSE:
- Create standardized repositories from pre-approved templates
- Ensure consistent project structure and setup
- Maintain compliance and best practices across new projects

CAPABILITIES:
- Creates a new repository from any GitHub template repository
- Supports private or public repository creation
- Allows custom repository name and description
- Includes all template repository files and structure
- Maintains git history from template (optional)

LIMITATIONS:
- Requires template repository to be marked as template on GitHub
- Cannot modify template contents during creation
- Template and new repository must be accessible to the authenticated user
- Cannot create repository if name already exists in organization/account

USE WHEN:
- Starting new projects based on standardized templates
- Creating repositories that need specific initial structure
- Implementing organization-wide repository patterns`, {
    template_owner: z.string(),
    template_repo: z.string(),
    owner: z.string(),
    name: z.string(),
    description: z.string().optional(),
    private: z.boolean().optional(),
    include_all_branches: z.boolean().optional()
  },
  async (params) => {
    try {
      const result = await githubClient.createRepositoryFromTemplate(params);
      return {
        content: [{
          type: "text",
          text: `Successfully created repository ${result.fullName}\nURL: ${result.htmlUrl}`
        }]
      };
    } catch (error) {
      console.error('Error creating repository from template:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating repository: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Get environment definitions from Azure DevCenter
server.tool("get-ade-defs",
  `List environment definitions available in an Azure DevCenter project.

PURPOSE:
- List available environment definitions in a DevCenter project
- Access standardized environment templates

CAPABILITIES:
- Lists environment definitions for a specific project
- Returns detailed template information

LIMITATIONS:
- Requires project name
- Requires appropriate Azure permissions
- Must have Azure CLI and DevCenter extension installed

USE WHEN:
- Setting up new development environments
- Exploring available environment templates`, {
    projectName: z.string()
  },
  async (params) => {
    try {
      const command = `az devcenter dev environment-definition list --dev-center-name "${DEVCENTER_NAME}" --project-name "${params.projectName}"`;
      const { execSync } = await import('child_process');
      const result = execSync(command).toString();
      const parsed = JSON.parse(result);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(parsed, null, 2)
        }]
      };
    } catch (error) {
      console.error('Error retrieving environment definitions:', error);
      return {
        content: [{
          type: "text",
          text: `Error retrieving environment definitions: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool 4: Create an Azure Deployment Environment (ADE)
server.tool("create-ade-env",
  `Create an Azure Deployment Environment (ADE) and return resource group details.

PURPOSE:
- Create consistent deployment environments based on existing IaC templates

CAPABILITIES:
- Creates a new environment in Azure based on a template in the DevCenter project
- Returns the resource group and subscription information
- Enables infrastructure provisioning via templates

LIMITATIONS:
- Requires valid project, environment type, and DevCenter name
- Environment name must be unique within the project

USE WHEN:
- Setting up new deployment environments
- Creating ephemeral testing environments
- Provisioning standardized infrastructure
- Implementing infrastructure as code based on enterprise approved templates`, {
    projectName: z.string(),
    envName: z.string(),
    envType: z.string(),
    envDefName: z.string(),
    catalogName: z.string().optional(),
  },
  async (params) => {
    try {
      const { execSync } = await import('child_process');
      
      const envDefName = params.envDefName || params.envType;
      
      console.error(`Creating ADE environment: ${params.envName}`);
      
      // Create the deployment environment
      let createCommand = `az devcenter dev environment create \
        --name "${params.envName}" \
        --environment-type "${params.envType}" \
        --dev-center "${DEVCENTER_NAME}" \
        --project "${params.projectName}" \
        --environment-definition-name "${envDefName}" \
        --parameters '{ "name": "${params.envName}" }' \
        --only-show-errors`;

      // Add catalog name flag only if provided
      if (params.catalogName) {
        createCommand += ` --catalog-name "${params.catalogName}"`;
      }
      
      execSync(createCommand);
      
      console.error("Environment created, retrieving details...");
      
      // Get the environment details to extract resource group info
      const showCommand = `az devcenter dev environment show \
        --name "${params.envName}" \
        --dev-center "${DEVCENTER_NAME}" \
        --project "${params.projectName}" \
        --only-show-errors --query resourceGroupId --output tsv`;
      
      const environment_rg = execSync(showCommand).toString().trim();
      
      // Extract resource group and subscription information
      const environment_group = environment_rg.split('/').pop() || '';
      const environment_sub = environment_rg.split('/resourceGroups')[0].split('/').pop() || '';
      
      return {
        content: [{
          type: "text",
          text: `Successfully created environment "${params.envName}"\n\nEnvironment Details:\n- Resource Group ID: ${environment_rg}\n- Resource Group: ${environment_group}\n- Subscription: ${environment_sub}`
        }]
      };
    } catch (error) {
      console.error('Error creating ADE environment:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating ADE environment: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
// ...existing code...

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);