It seems we need to install: 

- az CLI
- The devcenter extension to the az CLI
- azd CLI

It seems the following commands are useful to get environment templates

az devcenter dev environment-definition list --dev-center-name "test-db-center" --project-name "oracle-erp-devs"

So we need to know:

- The name of the dev center
- The name of the project 
- It does not seem like we can list environment definitions without a project

To see what catalogs are available to the project:

az devcenter dev catalog list -d test-db-center --project "oracle-erp-devs" 

To see catalogs in the devcenter:

az devcenter admin catalog list -d test-db-center --resource-group "DataDemo"

https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/ade-integration?branch=main#enable-azure-deployment-environment-support
To enable azd to work with ADE environments

azd config set platform.type devcenter

If you do that, then this command will get the templates from the Devcenter catalog (instead of the awesome repo):

azd template list

And the rest of azd commands will work with the ADE DevCenter

azd init

The azd init command experience in dev center mode shows all the azd compatible ADE templates for selection from your configured catalog. During the init process, after azd clones down the template code, the azure.yaml file will automatically be updated to include a platform section with the selected configuration based on the template that was chosen. The configuration includes the dev center name, catalog, and environment definition.

azd provision
just provision the ADE environment

azd up
package+provision+deploy
It prompts you to choose the ADE environment type etc

azd env list
list of ADE environments

Flow should probably be:

1. You have to login the user to Azure
    azd auth login

2. Ensure azd is configured in devcenter mode
    azd config set platform.type devcenter

3. Initialize the project for with AZD from an ADE template
    azd init -t <template_name> -e <env_name> --no-prompt 
    Pick up an ADE template that makes sense for this app
    The ADE template should be AZD friendly, read more here https://learn.microsoft.com/en-us/azure/deployment-environments/concept-azure-developer-cli-with-deployment-environments#azd-compatible-catalogs
    It will "merge" source with local repo source, may override stuff, so it should contain just the CD workflow for the type of App and perhaps some other minor artifacts
    
    It initializes the project locally, including source code from the azd template, and the infra from the ADE template

    This could be do with --no-prompt and inject template:

        -b, --branch string         The template branch to initialize from. Must be used with a template argument (--template or -t).
        --docs                  Opens the documentation for azd init in your web browser.
        -e, --environment string    The name of the environment to use.
        -f, --filter strings        The tag(s) used to filter template results. Supports comma-separated values.
            --from-code             Initializes a new application from your existing code.
        -h, --help                  Gets help for init.
        -l, --location string       Azure location for the new environment
        -s, --subscription string   Name or ID of an Azure subscription to use for the new environment
        -t, --template string       Initializes a new application from a template. You can use Full URI, <owner>/<repository>, or <repository> if it's part of the azure-samples organization.

4. Configure GitHub Actions secrets for Azure OIDC

5. Deploy (trigger CD Workflow)

6. Documentation
   - Document environment access procedures
   - List provisioned resources
   - Include azd commands for common operations


This approach does not scale
Requires creating an empty template when I can just use az in my CD pipeline
AZD is not great for this scenario