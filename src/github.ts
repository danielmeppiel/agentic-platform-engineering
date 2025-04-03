import { App } from "octokit";
import { RequestError } from "octokit";

export class GitHubClient {
  private app: App;
  private installationId: number;

  constructor(appId: string, privateKey: string, installationId: string) {
    if (!appId || !privateKey || !installationId) {
      throw new Error('Missing required GitHub configuration');
    }

    this.app = new App({
      appId,
      privateKey,
    });
    this.installationId = Number(installationId);
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
      const octokit = await this.app.getInstallationOctokit(this.installationId);
      
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
      const octokit = await this.app.getInstallationOctokit(this.installationId);
      
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