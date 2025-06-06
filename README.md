# Agentic Platform Engineering with GitHub Copilot, Azure & MCP

A Platform Engineering MCP Server offering reusable platform engineering workflows based on Azure and GitHub that can be run by your Agent. 

1. [Getting Started](#1-getting-started)
2. [Usage](#2-usage)
    - [Create a GitHub Repository based on a Repo template](#21-create-a-github-repository-based-on-a-template)
    - [Provision an Azure Deployment Environment and deploy your app](#22-provision-an-azure-deployment-environment-and-deploy-your-app)
3. [Architecture Overview](#3-architecture-overview)
4. [Detailed Workflow Sequence](#4-detailed-workflow-sequence)
5. [MCP Components and Their Value](#5-mcp-components-and-their-value)
    - [MCP Prompts: Guided Workflows](#51-mcp-prompts-guided-workflows)
    - [MCP Tools: Executable Capabilities](#52-mcp-tools-executable-capabilities)
6. [Configuration Repository](#6-configuration-repository)

## 1. Getting Started

### 1.1 Setup GitHub Authentication

This MCP Server supports two authentication methods with GitHub:
1. GitHub Personal Access Token (PAT) - Simpler setup, suitable for testing and personal use
2. GitHub App - More secure, recommended for production use and organization-wide deployment

#### Option 1: GitHub Personal Access Token (PAT)

> [!WARNING] 
> Use a PAT for testing and development purposes only. For production use, authenticate with a GitHub App.

The simplest way to get started is using a GitHub Personal Access Token:

1. Create a new PAT in GitHub:
   - Go to your GitHub Settings
   - Navigate to "Developer settings" > "Personal access tokens" > "Tokens (classic)"
   - Click "Generate new token (classic)"
   - Grant the following permissions:
     - `repo` (Full control of private repositories)
     - `workflow` (Update GitHub Action workflows)
   - Copy the generated token

2. Set the token in your environment:
   - Save the token as `GITHUB_PAT` environment variable
   - This is the only authentication variable you need when using PAT

#### Option 2: GitHub App (Recommended for Organizations)

For production use and better security, create and configure a GitHub App:

1. Create a new GitHub App in your Organization:
   - Go to your Organization's Settings
   - Navigate to "GitHub Apps" under "Developer settings", Click "New GitHub App"
   - Fill in the following details:
     - GitHub App name: e.g., "Platform Engineering MCP"
     - Homepage URL: Your organization's URL
     - Webhook: Disable (not required)
     - Repository permissions:
        - Contents: Read & write
        - Metadata: Read-only
        - Actions: Read & write
        - Administration: Read & write
   - Click "Create GitHub App"

2. Generate a private key for your GitHub App:
   - After creation, scroll down to the "Private keys" section and click "Generate a private key"
   - Save the downloaded .pem file securely

3. Install the GitHub App in your Organization:
   - On the GitHub App settings page, click "Install App"
   - Select the Organization where you want to install the app
   - Choose repositories:
     - Either select "All repositories"
     - Or select specific repositories including your PE configuration repository
   - Click "Install"

4. Write down the following environment variables:
    - `GITHUB_APP_ID`: Found in the GitHub App's settings page (displayed as "App ID")
    - `GITHUB_PRIVATE_KEY`: The contents of the .pem file you downloaded
      - Open the .pem file
      - Copy all contents including "-----BEGIN RSA PRIVATE KEY-----" and "-----END RSA PRIVATE KEY-----"
      - Replace newlines with "\n" in the .env file, ask Copilot to do this for you! 
    - `GITHUB_INSTALLATION_ID`: Found in the URL when you installed the app
      - Go to Organization Settings > GitHub Apps > Your App > Configure
      - The number in the URL after "installations/" is your installation ID
    - `PE_CONFIG_REPO`: Your organization's platform engineering configuration repository
      - Format: "organization-name/repository-name"

### 1.2 Setup your Engineering Platform on GitHub

You must either create or choose an existing repository as the one which will hold your engineering platform's configuration file. If you are authenticating with a GitHub App, this repo should be created in the organization where you have installed it. 

In your chosen repository:

  1. Create a file called `pe.yaml`. 
  2. Copy and paste the contents of the `config/pe.yaml` example file in this repo. This is just a starter example that you must edit.
  3. Edit your `pe.yaml` file to point to your repository templates. [GitHub's documentation on creating repository templates](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository).
  4. Edit your `pe.yaml` file to point to GitHub Organizations from where you want to source GitHub Actions workflow templates. These must be located under the `.github` repo's `workflow-templates` folder in each of the Organizations you add. [GitHub's documentation on creating workflow templates for your organization](https://docs.github.com/en/actions/sharing-automations/creating-workflow-templates-for-your-organization). 

Read more about this configuration repository at  [6. Configuration Repository](#6-configuration-repository), which explains the structure and purpose of the `pe.yaml` file.

### 1.3 Setup the MCP Server in VSCode Insiders

In VSCode Insiders, add a new MCP Server to your User Settings JSON file. You can use either authentication method. We recommend using Docker (preferred) for easier setup and consistency.

#### Option 1: Using Docker (Recommended)

Docker provides an isolated environment with all dependencies pre-installed, including the Azure CLI.

##### With GitHub Personal Access Token

```json
"mcp": {
    "servers": {
        "platform-eng-copilot": {
            "command": "docker",
            "args": [
                "run",
                "-i",
                "--rm",
                "-e", "GITHUB_PAT",
                "-e", "AZURE_SUBSCRIPTION_ID",
                "-e", "AZURE_TENANT_ID",
                "-e", "AZURE_CLIENT_ID",
                "-e", "AZURE_CLIENT_SECRET",
                "-e", "PE_CONFIG_REPO",
                "-e", "DEVCENTER_NAME",
                "-e", "DEVCENTER_PROJECT",
                "-e", "DEVCENTER_CATALOG",
                "platform-eng-copilot"
            ],
            "env": {
                "GITHUB_PAT": "<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>",

                "AZURE_SUBSCRIPTION_ID":"<YOUR_AZURE_SUBSCRIPTION_ID>",
                "AZURE_TENANT_ID":"<YOUR_AZURE_TENANT_ID>",
                "AZURE_CLIENT_ID":"<YOUR_AZURE_CLIENT_ID>",
                "AZURE_CLIENT_SECRET":"<YOUR_AZURE_CLIENT_SECRET>",
                
                "PE_CONFIG_REPO":"<YOUR_GITHUB_ORG>/<YOUR_REPO_WITH_PE_YAML_FILE>",
                "DEVCENTER_NAME":"<YOUR_DEVCENTER_NAME>",
                "DEVCENTER_PROJECT":"<YOUR_DEVCENTER_PROJECT>",
                "DEVCENTER_CATALOG":"<YOUR_DEVCENTER_CATALOG>"
            }
        }
    }
}
```

##### With GitHub App Authentication

```json
"mcp": {
    "servers": {
        "platform-eng-copilot": {
            "command": "docker",
            "args": [
                "run",
                "-i",
                "--rm",
                "-e", "GITHUB_APP_ID",
                "-e", "GITHUB_PRIVATE_KEY",
                "-e", "GITHUB_INSTALLATION_ID",
                "-e", "AZURE_SUBSCRIPTION_ID",
                "-e", "AZURE_TENANT_ID",
                "-e", "AZURE_CLIENT_ID",
                "-e", "AZURE_CLIENT_SECRET",
                "-e", "PE_CONFIG_REPO",
                "-e", "DEVCENTER_NAME",
                "-e", "DEVCENTER_PROJECT",
                "-e", "DEVCENTER_CATALOG",
                "platform-eng-copilot"
            ],
            "env": {
                "GITHUB_APP_ID": "<YOUR_GITHUB_APP_ID>",
                "GITHUB_PRIVATE_KEY":"<YOUR_GITHUB_APP_PRIVATE_KEY_WITH_NO_BREAKLINES>",
                "GITHUB_INSTALLATION_ID":"<YOUR_GITHUB_APP_INSTALLATION_ID>",
                
                ...
            }
        }
    }
}
```

#### Option 2: Using Node.js (Alternative)

For development purposes, you can also run the MCP server directly with Node.js:

```json
"mcp": {
    "servers": {
      "platform-eng-copilot": {
        "command": "node",
        "args": [
            "<ABSOLUTE_PATH>/platform-eng-copilot/dist/server.js"
        ],
        "env": {
          "GITHUB_PAT": "<YOUR_GITHUB_PERSONAL_ACCESS_TOKEN>",
          ...
        }
      }
   }
}
```

Make sure to replace all values between "<>" brackets with your actual configuration values. Only configure one authentication method - either PAT or GitHub App credentials.

## 2. Usage

> [!NOTE] 
> Using this MCP Server with VSCode won't allow you to use the implemented [MCP Prompts](https://spec.modelcontextprotocol.io/specification/2025-03-26/server/prompts/), as MCP Prompts are [not yet supported on VSCode](https://github.com/microsoft/vscode/issues/244173). 

Use [VSCode Reusable prompts](https://code.visualstudio.com/docs/copilot/copilot-customization#_reusable-prompt-files-experimental) with the prompt files made available in this repo under `.github/prompts`. Think about these as reusable workflows set up by your PE Admins which will guide the Agent through a complex task across several tools in your SDLC stack. 

For example, attach the `create-repo.prompt.md` prompt file in `.github/prompts` to the context and send it to GitHub Copilot. 

### 2.1 Create a GitHub Repository based on a template

**Value Proposition**: Automate the creation of standardized, compliant repositories based on GitHub Repository templates.

**Reusable Prompt**: `.github/prompts/create-repo.prompt.md`

**Workflow**:
1. Developer expresses intent to create a new project
2. LLM gathers requirements through natural conversation
3. PE MCP Server provides appropriate GitHub repo templates based on requirements
4. LLM recommends best template and explains reasoning
5. Upon confirmation, GitHub MCP creates repository from template
6. LLM recommends appropriate CI/CD workflows from PE MCP Server
7. GitHub MCP configures workflows
8. LLM offers to provision test environment
9. Azure MCP provisions resources if requested

### 2.2 Provision an Azure Deployment Environment and deploy your app

**Value Proposition**: Let the agent pick up the right ADE template for your app, provision the environment in Azure, generate the GitHub Actions CD workflow and deploy your app. 

**Reusable Prompt**: `.github/prompts/ade-deploy.prompt.md`

**Workflow**:
1. Developer requests environment for existing project
2. LLM determines project type and requirements
3. PE MCP Server provides appropriate environment templates
4. LLM recommends best template and explains reasoning
5. Upon confirmation, Azure MCP provisions resources
6. LLM summarizes provisioned resources and provides access information

## 3. Architecture Overview

This guide outlines an architecture for leveraging the Model Context Protocol (MCP) to create a powerful Platform Engineering experience through AI agents. By combining MCP's tools, prompts, and client-server architecture, we can create seamless, standardized workflows that automate complex platform engineering tasks while maintaining the human-in-the-loop element essential for critical decisions.

The architecture consists of three primary components:

1. **Client LLM Interface**: The entry point for users (GitHub Copilot in VS Code or GitHub.com)
2. **PE MCP Server**: The orchestration layer that defines workflows and exposes platform engineering capabilities
3. **Product-specific MCP Servers**: Specialized servers for GitHub, Azure, and other tools

```mermaid
    flowchart TD
    User([Developer])
    
    subgraph "Development Interfaces"
        VSCode[VS Code]
        GitHub[GitHub.com]
    end
    
    User -->|Uses| VSCode
    User -->|Uses| GitHub
    User -.->|Selects Prompt| PE_MCP
    VSCode -->|Natural Language| ClientLLM[GitHub Copilot Agent]
    GitHub -->|Natural Language| ClientLLM
    
    subgraph "MCP Ecosystem"
        ClientLLM <-->|MCP Prompts/Tools| PE_MCP[Platform Engineering MCP Server]
        ClientLLM <-->|MCP Tools| GitHub_MCP[GitHub MCP Server]
        ClientLLM <-->|MCP Tools| Azure_MCP[Azure MCP Server]
    end
    
    PE_MCP -->|Reads| ConfigRepo[(Configuration Repository)]
    
    subgraph "Orchestrated Resources"
        GitHub_MCP --> GitHubResources[GitHub Repositories
        GitHub Actions Workflows]
        Azure_MCP --> AzureResources[
        DevBox
        AKS
        App Services
        Functions
        CosmosDB
        Azure SQL
        Virtual Networks
        Load Balancers
        Azure Monitor]
    end
    
    style ClientLLM fill:#FF69B4,stroke:#fff,color:#fff
    style PE_MCP fill:#4169E1,stroke:#fff,color:#fff
    style GitHub_MCP fill:#2E8B57,stroke:#fff,color:#fff
    style Azure_MCP fill:#4682B4,stroke:#fff,color:#fff
    style ConfigRepo fill:#CD853F,stroke:#fff,color:#fff
    style AzureResources fill:#4682B4,stroke:#fff,color:#fff
    style GitHubResources fill:#2E8B57,stroke:#fff,color:#fff
    style User fill:#DEB887,stroke:#fff,color:#333
    style VSCode fill:#007ACC,stroke:#fff,color:#fff
    style GitHub fill:#24292E,stroke:#fff,color:#fff
    
    classDef default fill:#2F4F4F,stroke:#fff,color:#fff
```

## 4. Detailed Workflow Sequence

This sequence diagram demonstrates how the Platform Engineering system leverages the Model Context Protocol (MCP) to create a structured interaction between LLMs and platform tooling. The workflow follows MCP's key architectural principles:
<br><br>
```mermaid
sequenceDiagram
    User->>Client LLM: "Create a new Java project"
    Client LLM->>PE MCP Server: Invokes "create-project" prompt
    PE MCP Server->>Client LLM: Returns parameterized workflow guide
    Client LLM->>User: Requests detailed project requirements
    User->>Client LLM: Provides details (Java, Spring Boot, microservice, OAuth)
    
    Client LLM->>PE MCP Server: list-templates tool call with filters
    PE MCP Server->>Client LLM: Returns matching templates with detailed metadata
    
    Client LLM->>Client LLM: Analyzes templates against requirements
    Client LLM->>User: Recommends best template with explanation
    User->>Client LLM: Confirms template choice
    
    Client LLM->>GitHub MCP: create-repository tool call with chosen template
    GitHub MCP->>Client LLM: Repository created response
    
    Client LLM->>PE MCP Server: list-workflow-templates tool call
    PE MCP Server->>Client LLM: Returns available CI/CD workflow templates
    
    Client LLM->>Client LLM: Analyzes workflow templates against project needs
    Client LLM->>User: Recommends workflow templates with explanation
    User->>Client LLM: Confirms workflow choice
    
    Client LLM->>GitHub MCP: setup-workflows tool call with chosen workflows
    GitHub MCP->>Client LLM: Workflows configured
    
    Client LLM->>User: Ask about test environment
    User->>Client LLM: "Yes, provision test env"
    
    Client LLM->>PE MCP Server: list-environment-templates tool call
    PE MCP Server->>Client LLM: Returns matching environment templates
    Client LLM->>User: Recommends environment template with explanation
    User->>Client LLM: Confirms environment choice
    
    Client LLM->>Azure MCP: provision-resources call with chosen template
    Azure MCP->>Client LLM: Resources provisioned
    
    Client LLM->>User: Comprehensive summary of actions taken
```
<br>

1. **Prompts as Workflow Templates**: The PE MCP Server defines standardized prompt templates that guide both the LLM and user through complex platform engineering tasks. These prompts surface as discoverable, interactive elements.

   When a prompt is returned to the LLM, it includes structured guidance that helps the LLM:
   - Break down complex tasks into discrete steps
   - Select appropriate MCP tools from different servers (GitHub MCP, Azure MCP, etc.)
   - Maintain context across multiple tool invocations
   - Follow standardized workflows while adapting to specific requirements
   - Know when to seek user confirmation for critical decisions

2. **Tools for Concrete Actions**: Each action (creating repositories, configuring workflows, provisioning resources) is implemented as an MCP tool with well-defined parameters and validation, allowing the LLM to execute operations securely.

3. **Client-Server Architecture**: Following MCP's design, each service (PE, GitHub, Azure) runs as a separate server that exposes its capabilities through prompts and tools. The Client LLM acts as the coordinator, maintaining individual connections with each server.

4. **Human-in-the-Loop Control**: The workflow preserves MCP's human oversight model - all key decisions (template selection, workflow choices, environment provisioning) require explicit user confirmation before tools are invoked.

This approach ensures standardization while maintaining MCP's security principles and keeping humans in control of critical platform engineering decisions.

## 5. MCP Components and Their Value

### 5.1 MCP Prompts: Guided Workflows

MCP Prompts are essential for providing structured guidance to both the user and the LLM:

1. **Value in Platform Engineering**:
   - **Workflow Standardization**: Prompts define consistent workflows across the organization
   - **Guided Experience**: Step-by-step templates guide users through complex processes
   - **Context Preservation**: Maintain context throughout multi-step processes
   - **Discoverability**: Prompts appear as slash commands in supporting clients

2. **Implementation Approach**:
   - Define high-level workflow prompts that outline the entire process
   - Include dynamic parameters based on user requirements
   - Structure prompts as conversations that guide both user and LLM
   - Design prompts to anticipate common decision points

### 5.2 MCP Tools: Executable Capabilities

MCP Tools enable concrete actions and information retrieval:

1. **Value in Platform Engineering**:
   - **Action Execution**: Perform operations on GitHub, Azure, and other systems
   - **Information Retrieval**: Fetch available templates and configuration options
   - **Standardization**: Ensure operations follow organization standards
   - **Security**: Properly scoped tools with parameter validation

## 6. Configuration Repository

The PE MCP Server reads from a configuration file named `pe.yaml` that defines your platform engineering sources and templates. This file is structured into two main sections:

### 6.1 GitHub Workflow Organizations (`github_workflow_orgs`)

This section defines the GitHub organizations from which to source workflow templates. Each organization entry includes:

```yaml
github_workflow_orgs:
  - name: "my-company"          # Name of the organization
    url: "https://github.com/my-company"  # Organization's GitHub URL
    description: "Main company organization containing standard CI/CD workflows"
```

The workflow templates must be stored in the `.github/workflow-templates` directory of each listed organization. This follows [GitHub's standard for organization workflow templates](https://docs.github.com/en/actions/sharing-automations/creating-workflow-templates-for-your-organization).

### 6.2 GitHub Repository Templates (`github_repository_templates`)

This section defines repository templates that can be used as starting points for new projects. Each template includes comprehensive metadata to help the LLM make informed recommendations:

```yaml
github_repository_templates:
  - name: "java-springboot-microservice"  # Template name
    url: "https://github.com/my-company/java-springboot-template"  # Template repository URL
    description: "Spring Boot microservice with OAuth2 security and API documentation"
    metadata:
      language: java              # Primary programming language
      framework: springboot       # Main framework used
      architectureType: microservice  # Type of application architecture
      features:                   # Key features and capabilities
        - oauth2
        - swagger
        - actuator
      compliance:                 # Compliance standards met
        - soc2
      use-cases:                 # Recommended use cases
        - "Backend services requiring authentication"
      complexity: medium         # Project complexity level
```

The metadata helps the AI agent understand:
- Technical stack (language, framework)
- Architecture patterns
- Built-in features and capabilities
- Compliance requirements met
- Intended use cases
- Project complexity

This rich metadata enables the LLM to:
1. Match templates to user requirements
2. Explain template recommendations
3. Guide users through template customization
4. Suggest appropriate workflows and environments