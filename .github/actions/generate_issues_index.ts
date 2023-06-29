// Deno script that generates ./issues/issues.json to be consumed by the website.
import { Octokit } from "npm:@octokit/rest";
import { parse } from "https://deno.land/std@0.192.0/yaml/mod.ts";

const octokit = new Octokit({
	// GITHUB_TOKEN is automatically set by GitHub Actions.
	auth: Deno.env.get("GITHUB_TOKEN"),
});

interface Article {
	raw_url: string;
	title: string;
	author: string;
	coauthors?: string[];
	summary: string;
}

interface Issue {
	date: string;
	articles: Article[];
}

const content = await octokit.repos.getContent({
	owner: "MOD-Magazine",
	repo: "MOD-Magazine",
	path: "issues",
	// ref: "main",
    ref: "ci/generate-issues-json",
});

if (content.status !== 200 || !Array.isArray(content.data)) {
	console.error("Failed to fetch issues directory.");
	Deno.exit(1);
}

const issues: Issue[] = [];

for (const listing of content.data) {
	if (listing.type !== "dir") continue;

	const articles = await octokit.repos.getContent({
		owner: "MOD-Magazine",
		repo: "MOD-Magazine",
		path: listing.path,
		// ref: "main",
        ref: "ci/generate-issues-json",
	});

	if (articles.status !== 200 || !Array.isArray(articles.data)) {
		console.error(`Failed to fetch articles in ${listing.path}.`);
		Deno.exit(1);
	}

	const articleData: Article[] = await Promise.all(
		articles.data
			.filter(
				(article) => article.type === "file" && article.path.endsWith(".md")
			)
			.map(async (article) => {
				return (await fetch(article.download_url!)
					.then((r) => r.text())
					.then((a) => {
						return {
							raw_url: article.download_url!,
							...(parse(a.split("---")[1]) as object),
						};
					})) as Article;
			})
	);

	const issue: Issue = {
		date: listing.name,
		articles: articleData,
	};

	issues.push(issue);
}

console.log(JSON.stringify(issues, null, 2));
await Deno.writeTextFile("./issues/issues.json", JSON.stringify(issues));
