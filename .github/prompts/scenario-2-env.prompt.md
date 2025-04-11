# Environment Provisioning with Azure Developer CLI

Help me provision a deployment environment by following these steps:

1. Gather Environment Requirements:
   - Repository name: ${REPO_NAME}
   - Environment type name: ${ENV_NAME} (dev/test/prod)
   - Cloud provider: Azure
   - Workload type: ${WORKLOAD_TYPE} (containerized/serverless/web or anything else)

2. Search and propose an Azure Developer Environment (ADE) environment definitions that best matches the requirements of the application. To search for definitions, use the get-ade-defs tool. 

3. Ask the user to confirm the proposed ADE definition. Once the user confirms the template, get the details of the template with the get-ade-def tool. This allows checking if there are any required parameters that need to be passed later on when creating the environment with this definition, and if it is the case, ask the user for the value of these parameters.  

4. Create the ADE deployment environment using the create-ade-env tool. We may need to pass in parameters based on the selected ADE template on step 3. Make sure to let the user know that creating the ADE environment will take a few minutes.

5. With the resourceGroupId returned from the previous step, inspect the new environment and see what resources have been created in the environment using the get-ade-resources tool. Once you understand the deployed resources, look at the workspace project and figure out how to deploy the app to the environment. Take into account key elements such as operating systems in the deployed resources if applicable, the workspace project nature, etc.

Ask the user to validate and check the proposed deployment logic (which will be implemented using a GitHub Actions workflow).

6. Let's prepare to deploy our app to the ADE environment. We will need to setup OIDC to let GitHub Actions connect to Azure. For that, we need to create a federated credential with the create-federated-credential tool for the chosen environment type in our devcenter project. This requires for a MS Entra Application to exist already for that environment type (https://learn.microsoft.com/en-us/azure/deployment-environments/tutorial-deploy-environments-in-cicd-github#5-configure-deployment-identities)  

7. The returned Service Principal above has to be granted the Contributor role to our ADE deployment environment's resource group, using the resourceGroupId from step 4. This way, the SP will be able to deploy to our environment.

8. Create a new GitHub Environment to model the ADE with the same name as the environment type chosen. 

9. Add the AZURE_CLIENT_ID recovered in step 6 as a secret to the newly created GitHub environment. Do the same with the AZURE_TENANT_ID and AZURE_SUBSCRIPTION_ID (if you miss any of these two, ask the user to provide them, never invent the values).

10. Generate a GitHub Actions CD workflow pointing to the above GitHub Environment, which deploys to the Azure resources deployed in our ADE environment. Follow the plan previously validated with the user in step 5. You may need to use the resource group and subscription that where obtained in step 5.

11. Push the workflow to the GitHub remote repo. 

12. Document what you have done
   - Document environment access procedures
   - List provisioned resources
   - Include azd commands for common operations

You must ask the user to provide all templating variables when needed, which are indicated with the syntax ${VARIABLE}