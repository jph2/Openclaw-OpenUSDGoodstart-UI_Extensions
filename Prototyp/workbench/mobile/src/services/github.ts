import { Octokit } from '@octokit/rest';
import AsyncStorage from '@react-native-async-storage/async-storage';

let octokit: Octokit | null = null;

export const initGitHub = async (token: string) => {
  await AsyncStorage.setItem('github_token', token);
  octokit = new Octokit({ auth: token });
};

export const getGitHub = async () => {
  if (!octokit) {
    const token = await AsyncStorage.getItem('github_token');
    if (!token) throw new Error('Not authenticated');
    octokit = new Octokit({ auth: token });
  }
  return octokit;
};

export const logout = async () => {
  await AsyncStorage.removeItem('github_token');
  octokit = null;
};

export const getRepos = async () => {
  const gh = await getGitHub();
  const { data } = await gh.repos.listForAuthenticatedUser({ per_page: 100 });
  return data;
};

export const getRepoContent = async (owner: string, repo: string, path: string = '') => {
  const gh = await getGitHub();
  const { data } = await gh.repos.getContent({ owner, repo, path });
  return data;
};

export const getFileContent = async (owner: string, repo: string, path: string) => {
  const gh = await getGitHub();
  const { data } = await gh.repos.getContent({ owner, repo, path });
  if ('content' in data && !Array.isArray(data)) {
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content, sha: data.sha };
  }
  throw new Error('Not a file');
};

export const updateFile = async (
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string,
  message: string = 'Update via Workbench Mobile'
) => {
  const gh = await getGitHub();
  const encodedContent = Buffer.from(content).toString('base64');
  const { data } = await gh.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: encodedContent,
    sha,
  });
  return data;
};

export const QUICK_REPOS = [
  { owner: 'janhaluska', repo: 'studio-framework', name: 'Studio Framework' },
  { owner: 'janhaluska', repo: 'openclaw-workspace', name: 'OpenClaw Workspace' },
];
