{
  title: "Context All the Way Down",
  date:  "2026-03-10",
  description: "Patterns I've settled into after months of daily use with AI coding agents, focused on layered context and repository structure",
  type: "blog"
}

I've spent my career bouncing between engineering, developer advocacy, and product. I've shipped open source, worked on language standards, ran package managers, and now I lead product for a developer platform. I'm a product person who still reaches for a terminal before a Google Doc. These days that terminal usually has an AI agent in it.

I've been using agents daily for months now. For data analysis, strategy development, building prototypes, writing documents. After enough sessions I've landed on patterns that keep working, and the thing they all have in common is context.

The unlock for me wasn't a better prompt or a smarter model (although the latest Opus and GPT are incredible). It was realizing that context is layered, and the more layers you give the agent, the more useful it gets.

### Layers of context

There's a stack to how these tools pick up context, and it's worth being explicit about it because most people only think about the prompt they type.

At the base there's the agent's system prompt and built-in tools. You don't control this much, it's whatever the tool ships with. The system prompt bootstraps the agent's awareness of its own capabilities: reading and writing files, running code, executing SQL, searching the web. This is the foundation everything else builds on.

Next are your connections and integrations. For me that's a Snowflake connection that lets the agent query data directly, plus MCP integrations for Glean (internal doc and Slack search), Jira, and Graphite (stacked PRs). Each integration expands what the agent can reach at runtime. An agent that can search your company's internal docs and query your data warehouse has a fundamentally different context surface than one that can only read local files.

Then there are skills. These are like expertise modules that get loaded on demand. I have skills for managing data pipelines, generating presentations, tracking TODOs, running a morning briefing workflow. When a skill activates, it injects specialized instructions and workflows into the session. You can build your own or install shared ones.

On top of all that is a global user-level context file where I keep preferences and working style that apply across all projects (always use `uv` for Python, use Glean for searching Google Workspace, read files before overwriting them, that kind of thing).

And finally there's the repository itself, with project-specific context and all the artifacts you've accumulated. This is the most specific layer and the one I spend the most time investing in.

Each layer adds signal. By the time the agent opens a session in one of my project repos, it already knows my tooling preferences, my working style, the project domain, the key data sources, the gotchas, and the documents I've been developing. It's not starting from zero. That's the whole game.

### Strategy as a repository

The pattern that surprised me most was using repos as thinking workspaces, not code projects.

I have a couple of repos like this. One is a multi-year platform strategy document I've been developing. Another is product direction for a new initiative. They don't contain application code. They contain a context file with the thesis, vocabulary, competitive positioning, and writing guidelines, but they also contain the actual strategy documents, meeting summaries, competitive analyses, research notes, all generated and refined through working sessions with the agent.

The context file for one of these projects has a "session startup routine" that tells the agent to go check specific Google Docs and Slack channels for updates before we start working. MCP integrations make this possible. I have Glean configured for searching internal docs and Slack, and Jira for pulling in ticket context. When I open a session, the agent can go pull the latest program update or check if there are new comments on a design doc, and we start the conversation with current context rather than stale context.

The repo compounds over time. Every session picks up where the last one left off, not because of some magic memory system, but because the artifacts are all right there in the repository. The strategy document gets refined. New competitive research gets added. The context file gets updated with new terminology or a new stakeholder's perspective. It's a flywheel.

These repos also feed into each other. I've been working on a centralized developer strategy document where I'm collecting my thinking around where the world is heading, third horizon stuff. When I was recently asked to take over a new product area, I started a new repo to ramp up. I was able to bootstrap my thinking by pulling in context from the strategy repo. The work on the new product area then started influencing the strategy repo back. It's cyclical. The repos aren't isolated, they're a network of context that reinforces itself.

One thing I've been doing that I find genuinely useful: when a document is getting close to done, I spin up a swarm of agents with 0 context, each one given a different executive's perspective and priorities. I hand them the draft and ask for honest feedback. One session gets the perspective of an engineering leader who cares about feasibility and technical debt. Another gets the perspective of a business leader focused on market positioning. They don't know about each other, they just have a fresh context window with a personality prompt and the document. It's not a replacement for the real review, but it catches the obvious gaps and blind spots before you're in the room. I've rewritten entire sections based on feedback from these simulated reviews.

### Specs to prototypes

The other thing that's changed for me is building. I've been talking through ideas with agents, having them write specs, and then iterating on working prototypes.

When I was building a dashboard, I noticed the bash script I was using to manage all the dev tasks was getting out of control. I asked the agent how to make it more scalable and it suggested a Makefile, which makes me want to claw my own eyes out. There had to be a better way. So instead of just cleaning up the script, I started workshopping a product idea with the agent: what if our CLI had a built-in task runner? We went back and forth on the design, and the agent wrote a spec. I took that spec to a new agent session in the CLI repo and had it implement a [prototype](https://github.com/snowflakedb/snowflake-cli/tree/snow-run). Then I linked the prototype back into the original dashboard repo and had that agent refactor all the bash scripts to use the new runner. I could validate the developer experience immediately, in the same repo where I'd noticed the problem in the first place. The whole thing, from noticing the problem to validating the new DX, was maybe two hours. And that included the dashboard work I was doing at the same time.

A working demo generates more activation energy than a document. People engage differently when you show them a thing that runs versus a doc that describes a thing that could run. It's also honestly more fun to build than to write a document about building.

I find myself writing docs more for myself and agents these days. Not in a "docs are dead" way, more that the audience has shifted. I talk through what I want, the agent writes a spec to clarify the thinking, and then we use that spec as context to build. Then I show coworkers working things.

### Analysis and dashboards

I have repos that contain data pipelines, a dashboard, and a context file that captures the methodology for analyzing the data.

The context file for one of these projects is 336 lines. It has a data flow diagram showing how source tables feed through a silver layer of materialized views into a gold layer of pre-aggregated metrics. It defines 20 tables with their schemas. It documents a caching strategy. And it has 13 gotchas accumulated over months of analysis work, things like "never use raw account IDs for monthly active account analysis, always join through the salesforce dedup using the 3-way join pattern" and "SUM of averages is wrong, always SUM the daily column first then recompute the window function."

Another one is 590 lines covering table schemas, join methodology, version age bucketing for every product in the portfolio, partner breakdowns, and revenue analysis patterns.

When I open a session in one of these repos and ask a question about the data, the agent already knows which tables to query and how to join them correctly. It doesn't rediscover the gotchas I spent weeks figuring out. It starts from them.

The part that really drove it home for me was recently when I was onboarding another team into doing analysis on our driver stack. I gave them the analysis repo I'd used to do adoption projections. They cloned it and just started asking questions about driver adoption, traffic patterns, and usage to help them make product decisions. No onboarding doc, no walkthrough meeting. The context was already in the repo. The institutional knowledge transferred through the repository itself.

That's when this stopped feeling like a personal productivity trick and started feeling like something with legs.

### Wrapping up

The patterns I've described aren't specific to any one tool. I use [Cortex Code](https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code-cli), but Claude Code reads `CLAUDE.md`, Codex reads similar context files. The idea is the same across all of them: structure your project so the agent has your institutional knowledge, and it goes from generic assistant to something that actually knows your work. The tool matters less than the context you give it.

In the interest of transparency: this blog post was written with an agent. I had it analyze my entire history of using agents on my machine, every context file, every session, every repo. It generated a "how I use agents" document that we iterated on together, and that document became the context for writing this post. I talked through the ideas, iterated on structure through conversation, and the agent drafted while I steered. The layering model in the "layers of context" section? We built that by having the agent introspect on its own system prompt, tools, and configuration to make sure we got the hierarchy right. I still spent an hour and a half on this. Without an agent it would have taken many more hours, or honestly it just wouldn't have happened at all. The ten year gap in my blog archive is the proof.

That's the thing I keep coming back to. I'm a talker. I think through ideas by discussing them, not by staring at a blank document. The blank document was always the bottleneck, not the ideas. Having an agent to talk to removes that friction. I overthink less because I can offload the doubt to a conversation and iterate, which is more natural for me than trying to get it right on the first draft. It lets me operate faster and get more done, not because the agent is smarter than me, but because it reduces the friction that stopped me from doing things I wanted to do. Like writing a blog post. But the context creator is me, and that's where the human part comes in. The agent wouldn't have known which anecdotes to tie into each example, or which examples to surface in the first place.

What's made the biggest difference for me isn't the model or the features. It's investing in context. Building up layers of it so the agent can do real work, not generic work. The repos, the context files, the accumulated artifacts, that's what turns a conversation with an AI into an actual working session.
