# Environment Provisioning Scenario

Help me provision a deployment environment by following these steps:

1. Gather Environment Requirements:
   - Repository name: ${REPO_NAME}
   - Environment type: ${ENV_TYPE} (dev/staging/prod)
   - Cloud provider: Azure
   - Region: ${AZURE_REGION}
   - Resource requirements:
     - Compute: ${COMPUTE_TYPE} (AKS/VM/Container Apps)
     - Database: ${DATABASE_TYPE} (if needed)
     - Storage: ${STORAGE_TYPE} (if needed)

2. Find Infrastructure Template:
   - Use get-iac-templates tool to find IaC templates
   - Filter by:
     - Cloud provider: Azure
     - Infrastructure type: ${COMPUTE_TYPE}
     - Compliance requirements: ${COMPLIANCE_REQS}
   - Review and recommend best match based on requirements

3. Set Up Infrastructure:
   - Create new infrastructure branch in repository
   - Copy selected template to repository
   - Update template variables with environment specifics
   - Set up state storage for Terraform/Bicep
   - Configure Azure service principal access

4. Configure CD Workflow:
   - Use get-github-actions-templates to find deployment workflow
   - Set up environment secrets in GitHub:
     - Azure credentials
     - Environment-specific configs
   - Create deployment workflow with:
     - Infrastructure validation
     - Security checks
     - Deployment approvals
     - Post-deployment tests

5. Initial Deployment:
   - Run infrastructure deployment
   - Verify resource creation
   - Configure monitoring and alerting
   - Set up logging

6. Documentation:
   - Document environment access procedures
   - List configured resources


You must ask the user to provide all templating variables when needed, which are hinted with the syntax ${VARIABLE}