It seems we need to install: 

- az CLI
- The devcenter extension to the az CLI

Flow should probably be:

1. You have to login the user to Azure

    az auth login

2. Ensure devcenter extension is installed

    az extension add --name devcenter --upgrade

3. Get the ADE templates available from the catalog
    this is done in the MCP server

    az devcenter dev environment-definition list --dev-center-name "test-db-center" --project-name "oracle-erp-devs"

    Once the user confirms the template, get the details of the template

    az devcenter dev environment-definition show --catalog-name "quickstart-environment-definitions" --project "oracle-erp-devs" --name "WebApp" 
    --dev-center "test-db-center"

    This allows checking if there are any required parameters, and if it is the case, ask the user for the value of these parameters. It does not show the resources that are created by the template. 

4. Create the deployment environment

    az devcenter dev environment create \
              --name ${{ env.ENVIRONMENT_NAME }} \
              --environment-type ${{ env.ENVIRONMENT_TYPE }} \
              --dev-center ${{ vars.AZURE_DEVCENTER }} \
              --project ${{ vars.AZURE_PROJECT }} \
              --catalog-name ${{ vars.AZURE_CATALOG }} \
              --environment-definition-name ${{ vars.AZURE_CATALOG_ITEM }} \
              --parameters '{ "name": "${{ env.ENVIRONMENT_NAME }}" }' \
              --only-show-errors

    Note the above example includes 1 parameter "name", but this depends on step 3, dictated by the template details. Below a call without parameters:

    az devcenter dev environment create --name "my-ade-test-env" --environment-type "dev" --dev-center "test-db-center" --project "oracle-erp-devs" --environment-definition-name "WebApp" --catalog-name "quickstart-environment-definitions"

    Once environment created, returns URI and resourceGroupId among others. 
    Long process.

5. Obtain the details of the Azure resource group where this was created

environment_rg=$(az devcenter dev environment show --name ${{ env.ENVIRONMENT_NAME }} \
              --dev-center ${{ vars.AZURE_DEVCENTER }} --project ${{ vars.AZURE_PROJECT }} \
              --only-show-errors --query resourceGroupId --output tsv 2>&1)

environment_group=${environment_rg##*/}
environment_sub=${environment_rg%/resourceGroups*}
environment_sub=${environment_sub##*/}

6. The AI could in principle inspect the new environment and see what has been created in the environment, and figure out how to deploy to it (step 6).

    az resource list --resource-group oracle-erp-devs-my-ade-test-env --output json

    This will return the ARM JSONs. Another MCP Tool. 

    The user should validate and check the proposed deployment logic (GH Actions workflow AND/OR az deployment - see step 7).

7. Deploy to it. Use az deployment and the target resource_group and subscription from step 5. The AI can figure out how to deploy based on step 6 information

8. Configure a GitHub Environment to model the ADE and put the secrets/variables there
https://learn.microsoft.com/en-us/azure/deployment-environments/tutorial-deploy-environments-in-cicd-github 

9. Knowing what the ADE template deploys in terms of IAC (tell me what it deploys, step 6) generate a CD workflow pointing to the above GitHub Env, which creates the ADE environment AND deploys to it

    Example: https://github.com/Azure-Samples/deployment-environments-cicd-tutorial/blob/main/.github/workflows/environment_create.yml

    Use steps 1 to 6 to write the CD workflow. 

10. Configure GitHub Actions secrets for Azure OIDC

11. Deploy (trigger CD Workflow)

12. Documentation
   - Document environment access procedures
   - List provisioned resources
   - Include azd commands for common operations