# Environment Provisioning with Azure Developer CLI

Help me provision a deployment environment using Azure Developer CLI (azd) by following these steps:

1. Gather Environment Requirements:
   - Repository name: ${REPO_NAME}
   - Environment name: ${ENV_NAME} (dev/test/prod)
   - Cloud provider: Azure
   - Region: ${AZURE_REGION}
   - Workload type: ${WORKLOAD_TYPE} (containerized/serverless/web)

2. Select Azure Developer Template:
   - Use azd template catalog to find appropriate template
   - Filter by:
     - Workload type: ${WORKLOAD_TYPE}
     - Application type: ${APP_TYPE} (e.g., Node.js, Python, .NET)
     - Features needed: ${FEATURES} (e.g., monitoring, database, storage)

3. Initialize Environment:
   - Initialize new azd project with selected template
   - Configure environment settings:
     - Environment name
     - Azure region
     - Resource naming convention
   - Set up Azure authentication
   - Configure state management (automatic with azd)

4. Configure CI/CD:
   - Set up a GitHub environment for the GitHub repo
   - Configure Azure credentials with OIDC
   - Set up environment protection rules on the GitHub Environment
   - Add environment secrets:
     - Azure credentials (managed by OIDC)
     - Environment-specific variables
   - Create deployment GitHub Actions workflow with:
     - Infrastructure validation
     - Security scanning
     - Deployment approvals
     - Post-deployment checks

5. Provision and Deploy:
   - Run azd provision command
   - Execute initial deployment
   - Verify resource creation
   - Enable monitoring and logging (included in template)

6. Documentation:
   - Document environment access procedures
   - List provisioned resources
   - Include azd commands for common operations

You must ask the user to provide all templating variables when needed, which are indicated with the syntax ${VARIABLE}