import { Octokit } from "npm:@octokit/rest";

export const octokit = new Octokit({
	// GITHUB_TOKEN is automatically set by GitHub Actions.
	auth: Deno.env.get("GITHUB_TOKEN"),
});

export interface Article {
	raw_url: string;
	path: string;
	title: string;
	author: string;
	coauthors?: string[];
	summary: string;
}

export interface Issue {
	date: string;
	articles: Article[];
}