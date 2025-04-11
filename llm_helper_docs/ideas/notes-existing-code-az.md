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

4. Create the ADE deployment environment using the create-ade-env tool. We may need to pass in parameters based on the selected ADE template on step 3. If such is the case, ask the user to provide them. Make sure to let the user know that creating the ADE environment will take a few minutes.

5. With the resourceGroupId returned from the previous step, inspect the new environment and see what resources have been created in the environment using the get-ade-resources tool. Once you understand the deployed resources, look at the workspace project and figure out how to deploy the app to the environment.

Ask the user to validate and check the proposed deployment logic (which will be implemented using a GitHub Actions workflow).

6. Let's prepare to deploy our app to the ADE environment. We will need to setup OIDC to let GitHub Actions connect to Azure. For that, we need to create a federated credential with the create-federated-credential tool for the chosen environment type in our devcenter project. This requires for a MS Entra Application to exist already for that environment type (https://learn.microsoft.com/en-us/azure/deployment-environments/tutorial-deploy-environments-in-cicd-github#5-configure-deployment-identities)  

7. Create a new GitHub Environment to model the ADE with the same name as the environment type chosen. 

8. Add the AZURE_CLIENT_ID recovered in step 6 as a secret to the newly created GitHub environment. 

9. Generate a GitHub Actions CD workflow pointing to the above GitHub Environment, which deploys to the Azure resources deployed in our ADE environment. Follow the plan previously validated with the user in step 5. You may need to use the resource group and subscription that where obtained in step 5.

10. Push the workflow to the GitHub remote repo. 

11. Document what you have done
   - Document environment access procedures
   - List provisioned resources
   - Include azd commands for common operations