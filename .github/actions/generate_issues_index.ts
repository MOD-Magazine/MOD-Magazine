// Deno script that generates ./issues/issues.json to be consumed by the website.
import { parse } from "https://deno.land/std@0.192.0/yaml/mod.ts";
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

const latestCommit = await octokit.repos.getCommit({
	owner: "MOD-Magazine",
	repo: "MOD-Magazine",
	ref: "main",
});

console.log(latestCommit.data.sha);

const content = await octokit.repos.getContent({
	owner: "MOD-Magazine",
	repo: "MOD-Magazine",
	path: "issues",
	ref: latestCommit.data.sha,
});

if (content.status !== 200 || !Array.isArray(content.data)) {
	console.error("Failed to fetch issues directory.");
	Deno.exit(1);
}

let issues: Issue[] = [];

for (const listing of content.data) {
	if (listing.type !== "dir") continue;

	const articles = await octokit.repos.getContent({
		owner: "MOD-Magazine",
		repo: "MOD-Magazine",
		path: listing.path,
		ref: latestCommit.data.sha,
	});

	if (articles.status !== 200 || !Array.isArray(articles.data)) {
		console.error(`Failed to fetch articles in ${listing.path}.`);
		Deno.exit(1);
	}

	const articleData: Article[] = await Promise.all(
		articles.data
			.filter(
				(article) => article.type === "file" && article.path.endsWith(".md"),
			)
			.map(async (article) => {
				console.log(article.download_url);

				return (await fetch(article.download_url!)
					.then((r) => r.text())
					.then((a) => {
						return octokit.repos
							.listCommits({
								owner: "MOD-Magazine",
								repo: "MOD-Magazine",
								path: article.path,
							})
							.then((lastUpdated) => {
								const fm = parse(a.split("---")[1]) as object;
								return {
									raw_url: article.download_url!,
									path: article.path.split("issues/")[1].split(".md")[0],
									date: lastUpdated.data[0].commit.author.date,
									draft: fm.draft || false,
									...fm,
								};
							});
					})) as Article;
			}),
	);

	const issue: Issue = {
		date: listing.name,
		articles: articleData,
	};

	issues.push(issue);
}

issues = issues.map((i) => {
	i.articles = i.articles.sort((a, b) => {
		return new Date(b.date) - new Date(a.date);
	});

	return i;
});

console.log(JSON.stringify(issues, null, 2));
await Deno.writeTextFile(
	"./issues/issues.json",
	JSON.stringify(issues, null, 2),
);
