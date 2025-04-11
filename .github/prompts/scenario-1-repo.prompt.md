# Repository Provisioning Scenario

Help me create a new project by following these steps - please do strictly follow these steps:

1. Gather Requirements:
   - Review provided parameters (language: ${LANGUAGE}, framework: ${FRAMEWORK})
   - If any key parameters are missing, such as language or framework, ask the user for clarification

2. Find Repository Template:
   - Use get-repository-templates tool to find matching GitHub Repository templates
   - Filter by language, framework, architecture type if specified
   - Consider features (example: oauth2, material-ui) and compliance (example: soc2) if specified
   - Expand the search if you don't find matching templates at first, e.g. by removing filters - you must find a template. Do NEVER propose creating a repository without a template.
   - Review options and recommend best match to user

3. Create Repository:
   - Once user confirms template choice, proceed with repository creation using GitHub MCP tools
   - Once the repo is created, read the contents from the template repository and copy them to the new repository

4. Setup CI:
   - Use get-github-actions-templates tool to find in which Organizations we can look for approved GitHub Actions workflow templates
   - Once you find out where we can look for templates, ask the user to select the appropriate source Organization to look for those templates
   - Fetch the contents of the workflowsUrl of that organization - this is a folder containing all the approved CI GitHub Actions workflows
   - Recommend appropriate workflows based on project type
   - Ask the user to confirm the workflow template choice
   - Once the user confirms the template choice, create a workflow in the new repository by reading/fething the template workflow contents and then pushing a new workflow file to the new repo created above. Use the GitHub MCP tools for this.

5. Final Steps:
   - Summarize all actions taken
   - Provide next steps (git clone command) and resources to the user

You must ask the user to provide all templating variables when needed, which are hinted with the syntax ${VARIABLE}