# Repository Provisioning Scenario

Help me create a new project by following these steps:

1. Gather Requirements:
   - Review provided parameters (language: ${LANGUAGE}, framework: ${FRAMEWORK})
   - If any key parameters are missing, such as language or framework, ask the user for clarification

2. Find Repository Template:
   - Use get-repository-templates tool to find matching templates
   - Filter by language, framework, architecture type if specified
   - Consider features (example: oauth2, material-ui) and compliance (example: soc2) if specified
   - Review options and recommend best match to user

3. Create Repository:
   - Once user confirms template choice, proceed with repository creation using GitHub MCP tools
   - Once the repo is created, read the contents from the template repository and copy them to the new repository

4. Setup CI/CD:
   - Use get-github-actions-templates tool to find workflow templates
   - Recommend appropriate workflows based on project type
   - Once the user confirms the template choice, create a workflow in the new repository copying the template contents

5. Final Steps:
   - Summarize all actions taken
   - Provide next steps and resources to the user

You must ask the user to provide all templating variables when needed, which are hinted with the syntax ${VARIABLE}