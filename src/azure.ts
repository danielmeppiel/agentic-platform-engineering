import { execSync } from 'child_process';

export class AzureClient {
  private devCenterName: string;
  private devCenterProject: string;
  private devCenterCatalog: string;
  private subscriptionId: string;
  private tenantId?: string;
  private clientId?: string;
  private clientSecret?: string;

  constructor(config: {
    devCenterName: string;
    devCenterProject: string;
    devCenterCatalog: string;
    subscriptionId: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
    this.devCenterName = config.devCenterName;
    this.devCenterProject = config.devCenterProject;
    this.devCenterCatalog = config.devCenterCatalog;
    this.subscriptionId = config.subscriptionId;
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  async ensureAuthenticated(): Promise<void> {
    try {
      // First try to get current account info to check if already logged in
      execSync('az account show', { stdio: 'ignore' });
      console.error('Already authenticated with Azure CLI');
    } catch (error) {
      console.error('Not authenticated, attempting login...');
      
      if (this.clientId && this.clientSecret && this.tenantId) {
        console.error('Authenticating using service principal...');
        execSync(`az login --service-principal \
          --username "${this.clientId}" \
          --password "${this.clientSecret}" \
          --tenant "${this.tenantId}"`);
      } else {
        throw new Error('No authentication credentials provided. Please provide clientId, clientSecret, and tenantId');
      }
    }

    // Set subscription
    console.error(`Setting active subscription to: ${this.subscriptionId}`);
    execSync(`az account set --subscription "${this.subscriptionId}"`);
  }

  async listEnvironmentDefinitions(projectName?: string): Promise<string> {
    const project = projectName || this.devCenterProject;
    if (!project) {
      throw new Error('Project name must be provided either as a parameter or through DEVCENTER_PROJECT environment variable');
    }

    const command = `az devcenter dev environment-definition list --dev-center-name "${this.devCenterName}" --project-name "${project}"`;
    return execSync(command).toString();
  }

  async getEnvironmentDefinition(params: {
    defName: string;
    catalogName?: string;
    projectName?: string;
  }): Promise<string> {
    const projectName = params.projectName || this.devCenterProject;
    const catalogName = params.catalogName || this.devCenterCatalog;
    
    if (!projectName || !catalogName) {
      throw new Error('Project name and catalog name must be provided');
    }

    const command = `az devcenter dev environment-definition show \
      --catalog-name "${catalogName}" \
      --project "${projectName}" \
      --name "${params.defName}" \
      --dev-center "${this.devCenterName}"`;
    
    return execSync(command).toString();
  }

  async createEnvironment(params: {
    envName: string;
    envType: string;
    envDefName: string;
    projectName?: string;
    catalogName?: string;
    parameters?: string;
  }): Promise<{
    resourceGroupId: string;
    resourceGroup: string;
    subscription: string;
  }> {
    const projectName = params.projectName || this.devCenterProject;
    const catalogName = params.catalogName || this.devCenterCatalog;

    if (!projectName || !catalogName) {
      throw new Error('Project name and catalog name must be provided');
    }

    const envDefName = params.envDefName;
    
    console.error(`Creating ADE environment: ${params.envName}`);

    let createCommand = `az devcenter dev environment create \
      --name "${params.envName}" \
      --environment-type "${params.envType}" \
      --dev-center "${this.devCenterName}" \
      --project "${projectName}" \
      --environment-definition-name "${envDefName}" \
      --catalog-name "${catalogName}" \
      --only-show-errors`;

    if (params.parameters) {
      const deploymentParameters = JSON.parse(params.parameters);
      createCommand += ` --parameters '${JSON.stringify(deploymentParameters)}'`;
    }
    
    execSync(createCommand);
    
    console.error("Environment created, retrieving details...");
    
    const showCommand = `az devcenter dev environment show \
      --name "${params.envName}" \
      --dev-center "${this.devCenterName}" \
      --project "${projectName}" \
      --only-show-errors --query resourceGroupId --output tsv`;
    
    const environment_rg = execSync(showCommand).toString().trim();
    const environment_group = environment_rg.split('/').pop() || '';
    const environment_sub = environment_rg.split('/resourceGroups')[0].split('/').pop() || '';
    
    return {
      resourceGroupId: environment_rg,
      resourceGroup: environment_group,
      subscription: environment_sub
    };
  }

  async listResources(resourceGroup: string): Promise<string> {
    const command = `az resource list \
      --resource-group "${resourceGroup}" \
      --output json`;
    
    return execSync(command).toString();
  }

  async createEntraAppAndSP(params: {
    envType: string;
    projectName?: string;
    deploymentRG: string;
  }): Promise<{
    appId: string;
    appObjectId: string;
    servicePrincipalId: string;
    displayName: string;
  }> {
    const projectName = params.projectName || this.devCenterProject;
    if (!projectName) {
      throw new Error('Project name must be provided');
    }

    const envType = params.envType.charAt(0).toUpperCase() + params.envType.slice(1).toLowerCase();
    const displayName = `${projectName}-${envType}`;
    
    console.error(`Creating Entra App with display name: ${displayName}`);
    const appCreateCommand = `az ad app create --display-name "${displayName}"`;
    const appData = JSON.parse(execSync(appCreateCommand).toString());
    console.error(`Successfully created Entra App with ID: ${appData.id}`);
    
    const appId = appData.appId;
    const appObjectId = appData.id;
    
    console.error(`Creating Service Principal for app ID: ${appId}`);
    let servicePrincipalId: string;
    try {
      const spCreateCommand = `az ad sp create --id ${appId}`;
      const spData = JSON.parse(execSync(spCreateCommand).toString());
      servicePrincipalId = spData.id;
      console.error(`Successfully created Service Principal with ID: ${servicePrincipalId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('is already in use')) {
        console.error(`Service Principal already exists for app ID: ${appId}, fetching existing SP...`);
        const spShowCommand = `az ad sp show --id ${appId} --query id --output tsv`;
        servicePrincipalId = execSync(spShowCommand).toString().trim();
        console.error(`Found existing Service Principal with ID: ${servicePrincipalId}`);
      } else {
        throw error;
      }
    }
    
    if (!this.subscriptionId) {
      throw new Error('Subscription ID is required for getting project resource ID');
    }

    console.error(`Finding resource group for DevCenter project: ${projectName}`);
    const listProjectsCommand = `az devcenter admin project list \
      --subscription "${this.subscriptionId}" \
      --query "[?name=='${projectName}'].resourceGroup" \
      --output tsv`;
    
    console.error(`Executing command: ${listProjectsCommand}`);
    const resourceGroup = execSync(listProjectsCommand).toString().trim();
    
    if (!resourceGroup) {
      throw new Error(`Could not find resource group for project ${projectName}`);
    }
    console.error(`Found resource group: ${resourceGroup}`);

    console.error(`Getting azure resource ID for Devcenter project: ${projectName}`);
    const projectCommand = `az devcenter admin project show \
      --resource-group "${resourceGroup}" \
      --name "${projectName}" \
      --subscription "${this.subscriptionId}" \
      --query id \
      --output tsv`;
      
    console.error(`Executing command: ${projectCommand}`);
    const projectId = execSync(projectCommand).toString().trim();
    
    if (!projectId) {
      throw new Error(`Failed to get project ID for Devcenter project ${projectName}`);
    }
    console.error(`Successfully got Devcenter project ID: ${projectId}`);
    
    console.error(`Assigning Reader role to Service Principal at Devcenter project scope...`);
    const readerRoleCommand = `az role assignment create \
      --scope "${projectId}" \
      --role Reader \
      --assignee-object-id "${servicePrincipalId}" \
      --assignee-principal-type ServicePrincipal`;
    execSync(readerRoleCommand);
    console.error(`Successfully assigned Reader role`);
    
    console.error(`Assigning Deployment Environments User role to Service Principal...`);
    const envRoleCommand = `az role assignment create \
      --scope "${projectId}/environmentTypes/${envType}" \
      --role "Deployment Environments User" \
      --assignee-object-id "${servicePrincipalId}" \
      --assignee-principal-type ServicePrincipal`;
    execSync(envRoleCommand);
    console.error(`Successfully assigned Deployment Environments User role`);

    // Add Contributor role to the specific resource group
    console.error(`Assigning Contributor role to Service Principal for resource group: ${params.deploymentRG}...`);
    const rgRoleCommand = `az role assignment create \
      --scope "/subscriptions/${this.subscriptionId}/resourceGroups/${params.deploymentRG}" \
      --role "Contributor" \
      --assignee-object-id "${servicePrincipalId}" \
      --assignee-principal-type ServicePrincipal`;
    execSync(rgRoleCommand);
    console.error(`Successfully assigned Contributor role to resource group: ${params.deploymentRG}`);
    
    return {
      appId,
      appObjectId,
      servicePrincipalId,
      displayName
    };
  }

  async createFederatedCredential(params: {
    orgName: string;
    repoName: string;
    envType: string;
    projectName?: string;
  }): Promise<{
    appObjectId: string;
    credentialName: string;
    subject: string;
  }> {
    const projectName = params.projectName || this.devCenterProject;
    if (!projectName) {
      throw new Error('Project name must be provided');
    }

    const envType = params.envType.charAt(0).toUpperCase() + params.envType.slice(1).toLowerCase();
    
    const findAppCommand = `az ad app list --display-name "${projectName}-${envType}" --query "[0]"`;
    const appData = JSON.parse(execSync(findAppCommand).toString());
    
    if (!appData || !appData.id) {
      throw new Error(`Microsoft Entra application with display name "${projectName}-${envType}" not found`);
    }
    
    const appObjectId = appData.id;
    const credName = `ADE-${params.orgName}-${params.repoName}-${envType}`;
    const credSubject = `repo:${params.orgName}/${params.repoName}:environment:${envType}`;
    
    execSync(`az rest --method POST \
      --uri "https://graph.microsoft.com/beta/applications/${appObjectId}/federatedIdentityCredentials" \
      --body '{"name":"${credName}","issuer":"https://token.actions.githubusercontent.com","subject":"${credSubject}","description":"${envType}","audiences":["api://AzureADTokenExchange"]}'`);
    
    return {
      appObjectId,
      credentialName: credName,
      subject: credSubject
    };
  }
}
