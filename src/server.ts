import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as yaml from 'js-yaml';
import { PEConfig } from './types.js';
import { GitHubClient } from './github.js';
import { AzureClient } from './azure.js';

// GitHub authentication environment variables
const GITHUB_PAT: string = process.env.GITHUB_PAT || '';
const GITHUB_APP_ID: string = process.env.GITHUB_APP_ID || '';
const GITHUB_PRIVATE_KEY: string = process.env.GITHUB_PRIVATE_KEY || '';
const GITHUB_INSTALLATION_ID: string = process.env.GITHUB_INSTALLATION_ID || '';
const PE_CONFIG_REPO: string = process.env.PE_CONFIG_REPO || ''; // format: owner/repo
const PE_CONFIG_PATH: string = process.env.PE_CONFIG_PATH || 'pe.yaml';

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

// Environment variables for Azure authentication
const AZURE_SUBSCRIPTION_ID = process.env.AZURE_SUBSCRIPTION_ID || '';
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || '';
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || '';
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || '';
const DEVCENTER_NAME = process.env.DEVCENTER_NAME || '';
const DEVCENTER_PROJECT = process.env.DEVCENTER_PROJECT || '';
const DEVCENTER_CATALOG = process.env.DEVCENTER_CATALOG || '';

// Initialize Azure client
const azureClient = new AzureClient({
  devCenterName: DEVCENTER_NAME,
  devCenterProject: DEVCENTER_PROJECT,
  devCenterCatalog: DEVCENTER_CATALOG,
  subscriptionId: AZURE_SUBSCRIPTION_ID,
  tenantId: AZURE_TENANT_ID,
  clientId: AZURE_CLIENT_ID,
  clientSecret: AZURE_CLIENT_SECRET
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

PARAMETERS:
- language (optional): Programming language to filter templates by (e.g., 'typescript', 'python')
- framework (optional): Framework or library requirement (e.g., 'react', 'django')
- architectureType (optional): Architectural pattern to match (e.g., 'microservices', 'monolith')
- feature (optional): Specific feature to filter by (e.g., 'authentication', 'database')
- compliance (optional): Compliance requirement to filter by (e.g., 'HIPAA', 'SOC2')
- complexity (optional): Project complexity level (e.g., 'simple', 'complex')

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

PARAMETERS:
- organization (optional): Name of the organization to filter templates by. Case-insensitive partial match is supported.

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

PARAMETERS:
- template_owner (required): Owner of the template repository
- template_repo (required): Name of the template repository
- owner (required): Owner for the new repository
- name (required): Name for the new repository
- description (optional): Description for the new repository
- private (optional): Whether the new repository should be private
- include_all_branches (optional): Whether to include all branches from the template

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

// Tool: Get environment definitions from Azure DevCenter
server.tool("get-ade-defs",
  `List environment definitions available in an Azure DevCenter project.

PURPOSE:
- List available environment definitions in a DevCenter project
- Access standardized environment templates

CAPABILITIES:
- Lists environment definitions for a specific project
- Returns detailed template information

PARAMETERS:
- projectName (optional): Name of the DevCenter project. If not provided, will use DEVCENTER_PROJECT environment variable.

LIMITATIONS:
- Requires project name
- Requires appropriate Azure permissions
- Must have Azure CLI and DevCenter extension installed

USE WHEN:
- Setting up new development environments
- Exploring available environment templates`, {
    projectName: z.string().optional()
  },
  async (params) => {
    try {
      const result = await azureClient.listEnvironmentDefinitions(params.projectName);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(JSON.parse(result), null, 2)
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

// Tool: Get specific environment definition details
server.tool("get-ade-def",
  `Get details of a specific environment definition from Azure DevCenter.

PURPOSE:
- Retrieve detailed information about a specific environment definition
- Check template parameters and requirements
- View template configuration details

CAPABILITIES:
- Gets full definition details including parameters schema
- Shows template path and configuration
- Returns catalog and definition metadata

PARAMETERS:
- defName (required): Name of the environment definition to retrieve details for
- catalogName (optional): Name of the catalog containing the definition (defaults to DEVCENTER_CATALOG env var)
- projectName (optional): Name of the DevCenter project (defaults to DEVCENTER_PROJECT env var)

LIMITATIONS:
- Requires specific catalog, project and definition name

USE WHEN:
- Inspecting environment definition details
- Checking template parameters
- Validating template configuration`, {
    defName: z.string(),
    catalogName: z.string().optional(),
    projectName: z.string().optional()
  },
  async (params) => {
    try {
      const result = await azureClient.getEnvironmentDefinition(params);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(JSON.parse(result), null, 2)
        }]
      };
    } catch (error) {
      console.error('Error retrieving environment definition details:', error);
      return {
        content: [{
          type: "text",
          text: `Error retrieving environment definition details: ${error instanceof Error ? error.message : 'Unknown error'}`
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

PARAMETERS:
- envName (required): Name for the new environment. Must be unique within the project
- envType (required): Type of environment to create (e.g., 'Dev', 'Test', 'Prod')
- envDefName (required): Name of the environment definition template to use
- projectName (optional): Name of the DevCenter project (defaults to DEVCENTER_PROJECT env var)
- catalogName (optional): Name of the catalog containing the definition (defaults to DEVCENTER_CATALOG env var)
- parameters (optional): JSON string containing deployment parameters for the environment

LIMITATIONS:
- Requires valid project, environment type, and DevCenter name
- Environment name must be unique within the project

USE WHEN:
- Setting up new deployment environments
- Creating ephemeral testing environments
- Provisioning standardized infrastructure
- Implementing infrastructure as code based on enterprise approved templates`, {
    envName: z.string(),
    envType: z.string(),
    envDefName: z.string(),
    projectName: z.string().optional(),
    catalogName: z.string().optional(),
    parameters: z.string().optional(), // JSON string containing deployment parameters
  },
  async (params) => {
    try {
      const result = await azureClient.createEnvironment(params);
      
      return {
        content: [{
          type: "text",
          text: `Successfully created environment "${params.envName}"\n\nEnvironment Details:\n- Resource Group ID: ${result.resourceGroupId}\n- Resource Group: ${result.resourceGroup}\n- Subscription: ${result.subscription}`
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

// Tool: List Azure resources in a resource group
server.tool("get-ade-resources",
  `List all Azure resources in a resource group.

PURPOSE:
- Inspect resources deployed in an Azure Deployment Environment
- Understand the infrastructure components available
- Help determine deployment strategies based on resource types

CAPABILITIES:
- Lists all resources in a specified resource group
- Returns detailed ARM-format JSON for each resource
- Includes resource types, names, locations, and properties
- Shows resource relationships and dependencies

PARAMETERS:
- resourceGroup (required): Name of the resource group containing the resources to list

LIMITATIONS:
- Resource group must exist

USE WHEN:
- Analyzing deployed Azure resources
- Planning deployment strategies
- Debugging resource provisioning
- Understanding available infrastructure`, {
    resourceGroup: z.string()
  },
  async (params) => {
    try {
      const result = await azureClient.listResources(params.resourceGroup);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(JSON.parse(result), null, 2)
        }]
      };
    } catch (error) {
      console.error('Error listing Azure resources:', error);
      return {
        content: [{
          type: "text",
          text: `Error listing Azure resources: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Create Microsoft Entra App and Service Principal
server.tool("create-entra-app-and-sp",
  `Create a Microsoft Entra Application and Service Principal for an Azure Deployment Environment type.

PURPOSE:
- Create a Microsoft Entra application and service principal for authenticating ADE deployments
- Establishes identity needed for GitHub Actions to deploy to Azure environments
- First step in setting up OpenID Connect (OIDC) authentication for GitHub Actions
- Sets up appropriate RBAC roles for the service principal

CAPABILITIES:
- Creates a Microsoft Entra application with a display name following pattern [Project]-[EnvType]
- Creates a service principal for the application
- Assigns Reader role on the project level
- Assigns Deployment Environments User role for the specific environment type
- Returns necessary IDs for subsequent federated credential creation

PARAMETERS:
- envType (required): Environment type (e.g., 'Dev', 'Test', 'Prod')
- projectName (optional): Project name to use in the app display name (defaults to DEVCENTER_PROJECT env var)

LIMITATIONS:
- Requires Azure CLI with active authenticated session
- User must have permissions to create applications in Microsoft Entra
- User must have permissions to assign roles

USE WHEN:
- Setting up OpenID Connect authentication for GitHub Actions to Azure
- Creating identity for new environment types
- Establishing secure deployment pipelines with Azure`, {
    envType: z.string(),
    projectName: z.string().optional(),
  },
  async (params) => {
    try {
      const result = await azureClient.createEntraAppAndSP(params);
      
      return {
        content: [{
          type: "text",
          text: `Successfully created Microsoft Entra App and Service Principal for ${result.displayName}

                Application Details:
                - Display Name: ${result.displayName}
                - Application (Client) ID: ${result.appId}
                - Application Object ID: ${result.applicationId}
                - Service Principal ID: ${result.servicePrincipalId}

                To use these values in subsequent commands, you can set these environment variables:
                \`\`\`bash
                ${params.envType.toUpperCase()}_AZURE_CLIENT_ID=${result.appId}
                ${params.envType.toUpperCase()}_APPLICATION_ID=${result.applicationId}
                ${params.envType.toUpperCase()}_SERVICE_PRINCIPAL_ID=${result.servicePrincipalId}
                \`\`\`

                These IDs will be needed when creating federated credentials with the create-federated-credential tool.`
        }]
      };
    } catch (error) {
      console.error('Error creating Microsoft Entra App and Service Principal:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating Microsoft Entra App and Service Principal: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Create GitHub Actions federated credential
server.tool("create-federated-credential",
  `Create a federated identity credential for GitHub Actions OIDC authentication with Azure.

PURPOSE:
- Set up secure authentication between GitHub Actions and Azure
- Establish OpenID Connect (OIDC) trust relationship for secure deployments

CAPABILITIES:
- Finds Microsoft Entra application by display name pattern [DevCenter Project]-[EnvType]
- Creates federated identity credential linking the application to a GitHub repository
- Configures OIDC subject claims for secure token-based authentication

PARAMETERS:
- orgName (required): GitHub organization name
- repoName (required): GitHub repository name
- envType (required): Environment type (e.g., 'Dev', 'Test', 'Prod') that matches the Entra app
- projectName (optional): Project name used in the app display name (defaults to DEVCENTER_PROJECT env var)

LIMITATIONS:
- Requires the Microsoft Entra application to exist already
- GitHub repository must exist and be properly configured
- Microsoft Entra app must follow naming pattern [Project]-[EnvType]

USE WHEN:
- Configuring secure GitHub Actions workflows for Azure deployments
- Setting up CI/CD pipelines with OIDC authentication
- After creating Microsoft Entra app and service principal`, {
    orgName: z.string(),
    repoName: z.string(),
    envType: z.string(),
    projectName: z.string().optional(),
  },
  async (params) => {
    try {
      const result = await azureClient.createFederatedCredential(params);
      
      return {
        content: [{
          type: "text",
          text: `Successfully created federated identity credential

              Credential Details:
              - Application ID: ${result.appId}
              - Credential Name: ${result.credentialName}
              - Subject: ${result.subject}`
        }]
      };
    } catch (error) {
      console.error('Error creating federated credential:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating federated credential: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Create GitHub Deployment Environment
server.tool("create-deployment-environment",
  `Create a deployment environment in a GitHub repository.

PURPOSE:
- Create deployment environments for GitHub Actions workflows
- Set up protected environments with optional review requirements
- Configure deployment branch policies and wait timers

CAPABILITIES:
- Creates or updates a deployment environment in a GitHub repository
- Supports configuration of wait timers for deployments
- Allows setting up required reviewers (users or teams)
- Configures deployment branch policies
- Returns environment details including URLs and timestamps

PARAMETERS:
- owner (required): GitHub organization or user name
- repo (required): GitHub repository name
- environment_name (required): Name of the environment to create
- wait_timer (optional): Number of minutes to wait before allowing deployments
- reviewers (optional): Array of reviewer objects with type (User/Team) and id
- deployment_branch_policy (optional): Branch protection settings

LIMITATIONS:
- Requires appropriate repository permissions
- Reviewer IDs must be valid GitHub user or team IDs
- Wait timer must be between 0 and 43200 minutes (30 days)

USE WHEN:
- Setting up new deployment pipelines
- Implementing environment protection rules
- Creating staging or production environments
- Configuring deployment approvals`, {
    owner: z.string(),
    repo: z.string(),
    environment_name: z.string(),
    wait_timer: z.number().min(0).max(43200).optional(),
    reviewers: z.array(z.object({
      type: z.enum(['User', 'Team']),
      id: z.number()
    })).optional(),
    deployment_branch_policy: z.object({
      protected_branches: z.boolean(),
      custom_branch_policies: z.boolean()
    }).optional()
  },
  async (params) => {
    try {
      const result = await githubClient.createDeploymentEnvironment(params);
      
      return {
        content: [{
          type: "text",
          text: `Successfully created/updated deployment environment: ${params.environment_name}

              Environment Details:
              - Name: ${result.name}
              - URL: ${result.url}
              - Created At: ${result.createdAt}
              - Updated At: ${result.updatedAt}
              ${params.wait_timer ? `- Wait Timer: ${params.wait_timer} minutes` : ''}
              ${params.reviewers ? `- Required Reviewers: ${params.reviewers.length}` : ''}
              ${params.deployment_branch_policy ? `- Branch Policy: ${JSON.stringify(params.deployment_branch_policy)}` : ''}`
        }]
      };
    } catch (error) {
      console.error('Error creating deployment environment:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating deployment environment: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Tool: Create GitHub Environment Secret
server.tool("create-environment-secret",
  `Create or update an encrypted secret in a GitHub environment.

PURPOSE:
- Securely store sensitive information in GitHub environment secrets
- Enable secure access to credentials in GitHub Actions workflows
- Manage environment-specific configuration values

CAPABILITIES:
- Automatically retrieves environment-specific encryption keys
- Encrypts secret values using LibSodium
- Creates or updates secrets in GitHub environments
- Uses GitHub's recommended encryption methods

PARAMETERS:
- owner (required): GitHub organization or user name
- repo (required): GitHub repository name
- environment_name (required): Name of the environment to add the secret to
- secret_name (required): Name of the secret
- value (required): The unencrypted value of the secret

LIMITATIONS:
- Requires appropriate repository permissions
- Secret names must be valid GitHub secret names
- Environment must exist before creating secrets
- Maximum secret size limits apply

USE WHEN:
- Setting up deployment credentials
- Storing environment-specific configuration
- Managing API keys and tokens
- Configuring service connections`, {
    owner: z.string(),
    repo: z.string(),
    environment_name: z.string(),
    secret_name: z.string(),
    value: z.string()
  },
  async (params) => {
    try {
      const result = await githubClient.createEnvironmentSecret(params);
      
      return {
        content: [{
          type: "text",
          text: `Successfully ${result.status} secret '${params.secret_name}' in environment '${params.environment_name}'

                  Details:
                  - Repository: ${params.owner}/${params.repo}
                  - Environment: ${params.environment_name}
                  - Secret Name: ${params.secret_name}
                  - Status: ${result.status}`
        }]
      };
    } catch (error) {
      console.error('Error creating environment secret:', error);
      return {
        content: [{
          type: "text",
          text: `Error creating environment secret: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function main() {
  // Ensure Azure authentication before starting
  try {
    await azureClient.ensureAuthenticated();
    console.error('Successfully authenticated with Azure');
  } catch (error) {
    console.error('Failed to authenticate with Azure:', error);
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);