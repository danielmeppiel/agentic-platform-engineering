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