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

  async createDeploymentEnvironment(params: {
    owner: string;
    repo: string;
    environment_name: string;
    wait_timer?: number;
    reviewers?: Array<{ type: 'User' | 'Team'; id: number; }>;
    deployment_branch_policy?: { protected_branches: boolean; custom_branch_policies: boolean; };
  }) {
    try {
      const octokit = await this.getOctokit();
      
      const response = await octokit.request('PUT /repos/{owner}/{repo}/environments/{environment_name}', {
        owner: params.owner,
        repo: params.repo,
        environment_name: params.environment_name,
        wait_timer: params.wait_timer,
        reviewers: params.reviewers,
        deployment_branch_policy: params.deployment_branch_policy,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      return {
        name: response.data.name,
        url: response.data.html_url,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
    } catch (error) {
      if (error instanceof RequestError) {
        throw new Error(`GitHub API error: ${error.message} (Status: ${error.status})`);
      }
      throw error;
    }
  }

  private async getEnvironmentPublicKey(owner: string, repo: string, environment_name: string): Promise<{ key: string; key_id: string }> {
    const octokit = await this.getOctokit();
    const response = await octokit.request('GET /repos/{owner}/{repo}/environments/{environment_name}/secrets/public-key', {
      owner,
      repo,
      environment_name,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    return {
      key: response.data.key,
      key_id: response.data.key_id
    };
  }

  async createEnvironmentSecret(params: {
    owner: string;
    repo: string;
    environment_name: string;
    secret_name: string;
    value: string;
  }) {
    try {
      // Import and properly initialize sodium using ES module dynamic import
      const sodium = await import('libsodium-wrappers').then(module => module.default || module);
      await sodium.ready;

      // Get the public key for the environment
      const { key, key_id } = await this.getEnvironmentPublicKey(
        params.owner,
        params.repo,
        params.environment_name
      );

      // Convert Secret & Base64 key to Uint8Arrays
      const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
      const binsec = sodium.from_string(params.value);

      // Encrypt the secret using LibSodium
      const encBytes = sodium.crypto_box_seal(binsec, binkey);
      const encrypted_value = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);

      const octokit = await this.getOctokit();
      
      // Create/update the secret
      const response = await octokit.request('PUT /repos/{owner}/{repo}/environments/{environment_name}/secrets/{secret_name}', {
        owner: params.owner,
        repo: params.repo,
        environment_name: params.environment_name,
        secret_name: params.secret_name,
        encrypted_value,
        key_id,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      return {
        status: response.status === 201 ? 'created' : 'updated',
        url: response.url
      };
    } catch (error) {
      if (error instanceof RequestError) {
        throw new Error(`GitHub API error: ${error.message} (Status: ${error.status})`);
      }
      throw error;
    }
  }
}