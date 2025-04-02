import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PEConfig } from './types.js';

// Load PE configuration from YAML
function loadPEConfig(): PEConfig {
  try {
    const configPath = path.resolve(__dirname, 'config', 'pe.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContents) as PEConfig;
    return config;
  } catch (error) {
    console.error('Error loading PE configuration:', error);
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
        text: `Follow these steps to create a new project:

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
            - Configure initial repository settings based on template

          4. Setup CI/CD:
            - Use get-github-actions-templates tool to find workflow templates
            - Recommend appropriate workflows based on project type
            - Configure workflows after user confirmation

          5. Final Steps:
            - Summarize all actions taken
            - Provide next steps and resources to the user`
      }
    }]
  })
);

// Load the PE configuration
const peConfig = loadPEConfig();

// Tool 1: Get available repository templates with optional filters
server.tool(
  "get-repository-templates",
  {
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
server.tool(
  "get-github-actions-templates",
  {
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

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);