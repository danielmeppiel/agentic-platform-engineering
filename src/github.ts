import { App, Octokit } from "octokit";
import { RequestError } from "octokit";

export class GitHubClient {
  private app?: App;
  private pat?: string;
  private installationId?: number;

  constructor(options: {
    pat?: string;
    appId?: string;
    privateKey?: string;
    installationId?: string;
  }) {
    // If PAT is provided, use it
    if (options.pat) {
      this.pat = options.pat;
      return;
    }

    // Otherwise, try GitHub App authentication
    if (!options.appId || !options.privateKey || !options.installationId) {
      throw new Error('Either GITHUB_PAT or all GitHub App credentials (GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_INSTALLATION_ID) must be provided');
    }

    this.app = new App({
      appId: options.appId,
      privateKey: options.privateKey,
    });
    this.installationId = Number(options.installationId);
  }

  private async getOctokit(): Promise<Octokit> {
    if (this.pat) {
      return new Octokit({ auth: this.pat });
    }

    if (!this.app || !this.installationId) {
      throw new Error('No authentication method available');
    }

    return await this.app.getInstallationOctokit(this.installationId);
  }

  async createRepositoryFromTemplate(params: {
    template_owner: string;
    template_repo: string;
    owner: string;
    name: string;
    description?: string;
    private?: boolean;
    include_all_branches?: boolean;
  }) {
    try {
      const octokit = await this.getOctokit();
      
      const response = await octokit.request('POST /repos/{template_owner}/{template_repo}/generate', {
        template_owner: params.template_owner,
        template_repo: params.template_repo,
        owner: params.owner,
        name: params.name,
        description: params.description,
        private: params.private ?? true,
        include_all_branches: params.include_all_branches ?? false
      });

      return {
        fullName: response.data.full_name,
        htmlUrl: response.data.html_url
      };
    } catch (error) {
      if (error instanceof RequestError) {
        throw new Error(`GitHub API error: ${error.message} (Status: ${error.status})`);
      }
      throw error;
    }
  }

  async getConfigFile(owner: string, repo: string, path: string): Promise<string> {
    try {
      const octokit = await this.getOctokit();
      
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in response.data && typeof response.data.content === 'string') {
        return Buffer.from(response.data.content, 'base64').toString();
      }
      
      throw new Error('Unexpected response structure: content not found.');
    } catch (error) {
      if (error instanceof RequestError) {
        throw new Error(`GitHub API error: ${error.message} (Status: ${error.status})`);
      }
      throw error;
    }
  }
}