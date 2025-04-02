export type GitHubWorkflowOrg = {
  name: string;
  url: string;
  description: string;
};

export type RepositoryTemplate = {
  name: string;
  url: string;
  description: string;
  metadata: {
    language: string;
    framework: string;
    architectureType: string;
    features: string[];
    compliance: string[];
    'use-cases': string[];
    complexity: 'low' | 'medium' | 'high';
  };
};

export type PEConfig = {
  sources: {
    github_workflow_orgs: GitHubWorkflowOrg[];
    github_repository_templates: RepositoryTemplate[];
  };
};