import { execSync } from 'child_process';

export class AzureClient {
  private devCenterName: string;
  private devCenterProject: string;
  private devCenterCatalog: string;

  constructor(config: {
    devCenterName: string;
    devCenterProject: string;
    devCenterCatalog: string;
  }) {
    this.devCenterName = config.devCenterName;
    this.devCenterProject = config.devCenterProject;
    this.devCenterCatalog = config.devCenterCatalog;
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
  }): Promise<{
    appId: string;
    applicationId: string;
    servicePrincipalId: string;
    displayName: string;
  }> {
    const projectName = params.projectName || this.devCenterProject;
    if (!projectName) {
      throw new Error('Project name must be provided');
    }

    const envType = params.envType.charAt(0).toUpperCase() + params.envType.slice(1).toLowerCase();
    const displayName = `${projectName}-${envType}`;
    
    const appCreateCommand = `az ad app create --display-name "${displayName}"`;
    const appData = JSON.parse(execSync(appCreateCommand).toString());
    
    const appId = appData.appId;
    const applicationId = appData.id;
    
    const spCreateCommand = `az ad sp create --id ${appId}`;
    const spData = JSON.parse(execSync(spCreateCommand).toString());
    const servicePrincipalId = spData.id;
    
    const projectCommand = `az devcenter dev project show --name "${projectName}" --dev-center "${this.devCenterName}" --query id --output tsv`;
    const projectId = execSync(projectCommand).toString().trim();
    
    execSync(`az role assignment create \
      --scope "${projectId}" \
      --role Reader \
      --assignee-object-id "${servicePrincipalId}" \
      --assignee-principal-type ServicePrincipal`);
    
    execSync(`az role assignment create \
      --scope "${projectId}/environmentTypes/${envType}" \
      --role "Deployment Environments User" \
      --assignee-object-id "${servicePrincipalId}" \
      --assignee-principal-type ServicePrincipal`);
    
    return {
      appId,
      applicationId,
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
    appId: string;
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
    
    const appId = appData.id;
    const credName = `ADE${envType}`;
    const credSubject = `repo:${params.orgName}/${params.repoName}:environment:${envType}`;
    
    execSync(`az rest --method POST \
      --uri "https://graph.microsoft.com/beta/applications/${appId}/federatedIdentityCredentials" \
      --body '{"name":"${credName}","issuer":"https://token.actions.githubusercontent.com","subject":"${credSubject}","description":"${envType}","audiences":["api://AzureADTokenExchange"]}'`);
    
    return {
      appId,
      credentialName: credName,
      subject: credSubject
    };
  }
}
