import { Octokit } from "npm:@octokit/rest";

export const octokit = new Octokit({
	auth: Deno.env.get("GITHUB_TOKEN"),
});

export interface Article {
	raw_url: string;
	path: string;
	date: string;
	title: string;
	draft?: boolean;
	author: string;
	image?: string;
	coauthors?: string[];
	summary: string;
}

export interface Issue {
	date: string;
	articles: Article[];
}
