import { post, Embed } from "https://deno.land/x/dishooks@v1.1.0/mod.ts";
import { Article, Issue, octokit } from "./shared.ts";

async function fetchIssues(ref: string): Promise<Issue[]> {
	const content = await octokit.repos.getContent({
		owner: "MOD-Magazine",
		repo: "MOD-Magazine",
		path: "issues/issues.json",
		ref: ref,
	});

	if (content.status !== 200 || Array.isArray(content.data)) {
		console.error("Failed to fetch issues/issues.json");
		Deno.exit(1);
	}

	return await fetch(content.data.download_url!).then((r) => r.json());
}

async function findNewArticles(): Promise<Article[]> {
	const previousCommit = await new Deno.Command("git", {
		args: ["rev-parse", "HEAD^1"],
		stdout: "piped",
	}).output();

	const currentIssues = await fetchIssues("main");
	const previousIssues = await fetchIssues(
		new TextDecoder().decode(previousCommit.stdout).trim()
	);

	const newArticles: Article[] = [];

	for (const currentIssue of currentIssues) {
		const previousIssue = previousIssues.find(
			(issue) => issue.date === currentIssue.date
		);

		if (!previousIssue) {
			newArticles.push(...currentIssue.articles);
			continue;
		}

		for (const currentArticle of currentIssue.articles) {
			if (
				!previousIssue.articles.find(
					(article) => article.path === currentArticle.path
				)
			) {
				newArticles.push(currentArticle);
			}
		}
	}

	return newArticles;
}

const newArticles = await findNewArticles();

if (newArticles.length === 0) {
	console.log("No new articles found.");
	Deno.exit(0);
}

const embeds: Embed[] = newArticles.map((article) => {
	return {
		url: `https://modmagazine.net/issues/${article.path}`,
		title: article.title,
		description: article.summary,
		author: {
			name: article.author,
		},
	};
});

await post(Deno.env.get("WEBHOOK_URL")!, {
	content: "New articles have been published!",
	embeds: embeds,
}, true, true, "...");
