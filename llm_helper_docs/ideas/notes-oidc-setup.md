5. Configure deployment identities
OpenID Connect with GitHub Actions is an authentication method that uses short-lived tokens to provide hardened security. It's the recommended way to authenticate GitHub Actions to Azure.

You can also authenticate a service principal directly by using a secret, but that's out of scope for this tutorial.

5.1 Generate deployment identities
Register Microsoft Entra applications and service principals for each of the three environment types.

Create the Microsoft Entra application for Dev:

Azure CLI

Copy
az ad app create --display-name "$AZURE_PROJECT-Dev"
This command outputs JSON with an id that you use when creating federated credentials with Graph API, and an appId (also called a client ID).

Set the following environment variables:

Azure CLI

Copy
DEV_AZURE_CLIENT_ID=<appId>
DEV_APPLICATION_ID=<id>
Repeat these steps for Test:

Azure CLI

Copy
az ad app create --display-name "$AZURE_PROJECT-Test"
Azure CLI

Copy
TEST_AZURE_CLIENT_ID=<appId>
TEST_APPLICATION_ID=<id>
Repeat the steps again for Prod:

Azure CLI

Copy
az ad app create --display-name "$AZURE_PROJECT-Prod"
Azure CLI

Copy
PROD_AZURE_CLIENT_ID=<appId>
PROD_APPLICATION_ID=<id>
Create a service principal for each application.

Run the following command to create a new service principal for Dev:

Azure CLI

Copy
 az ad sp create --id $DEV_AZURE_CLIENT_ID
This command generates JSON output with a different id that will be used in the next step.

Set the following environment variable:

Azure CLI

Copy
DEV_SERVICE_PRINCIPAL_ID=<id>
Repeat these steps for Test:

Azure CLI

Copy
 az ad sp create --id $TEST_AZURE_CLIENT_ID
Azure CLI

Copy
TEST_SERVICE_PRINCIPAL_ID=<id>
Repeat the steps again for Prod:

Azure CLI

Copy
 az ad sp create --id $PROD_AZURE_CLIENT_ID
Azure CLI

Copy
PROD_SERVICE_PRINCIPAL_ID=<id>
Run the following commands to create a new federated identity credential for each Microsoft Entra application.

In each of the three following commands, replace < Organization/Repository > with your GitHub organization and repository name.

Create the federated identity credential for Dev:

Azure CLI

Copy
az rest --method POST \
    --uri "https://graph.microsoft.com/beta/applications/$DEV_APPLICATION_ID/federatedIdentityCredentials" \
    --body '{"name":"ADEDev","issuer":"https://token.actions.githubusercontent.com","subject":"repo:< Organization/Repository >:environment:Dev","description":"Dev","audiences":["api://AzureADTokenExchange"]}'
Create the credential for Test:

Azure CLI

Copy
az rest --method POST \
    --uri "https://graph.microsoft.com/beta/applications/$TEST_APPLICATION_ID/federatedIdentityCredentials" \
    --body '{"name":"ADETest","issuer":"https://token.actions.githubusercontent.com","subject":"repo:< Organization/Repository >:environment:Test","description":"Test","audiences":["api://AzureADTokenExchange"]}'
Create the credential for Prod:

Azure CLI

Copy
az rest --method POST \
    --uri "https://graph.microsoft.com/beta/applications/$PROD_APPLICATION_ID/federatedIdentityCredentials" \
    --body '{"name":"ADEProd","issuer":"https://token.actions.githubusercontent.com","subject":