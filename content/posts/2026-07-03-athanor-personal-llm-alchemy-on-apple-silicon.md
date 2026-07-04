{
title: "Local Inference Doesn't Need Another Runtime. It Needs a Control Plane.",
date:  "2026-07-04",
description: "Athanor is a local model gateway and supervisor for Apple Silicon that treats operations, not inference, as the real problem.",
type: "blog"
}

Running local models on Apple Silicon has quietly become practical. Between Apple's [MLX](https://github.com/ml-explore/mlx) framework and [llama.cpp](https://github.com/ggml-org/llama.cpp), you can run agents and do real tasks on consumer hardware. The hard part is no longer inference. It is operations.

I wanted to see what was possible, but because I can't help myself, I spent most of my time building infrastructure instead of actually using the models.

That infrastructure is [**athanor**](https://github.com/MylesBorins/athanor), a local model gateway and supervisor. Rather than another runtime, it's an operational layer that sits above the runtimes you already use: it runs in the background, routing requests to [`llama-server`](https://github.com/ggml-org/llama.cpp/tree/master/tools/server) for GGUF models and to [`mlx_lm.server`](https://github.com/ml-explore/mlx-lm) or [`mlx_vlm.server`](https://github.com/ml-explore/mlx-vlm) for MLX models. All of this is exposed to downstream clients through a single, stable OpenAI-compatible port. I think local inference needs the same operational abstractions we've come to expect from cloud infrastructure. Athanor is my attempt to bring those ideas to a single Mac. (If you want to install it immediately, you can jump straight to [Getting started](#getting-started)).

I started with [Ollama](https://ollama.com/), which is a great wrapper around llama.cpp and GGUF models. It worked well, but I quickly wanted MLX support too. Once I started experimenting with MLX, I found myself maintaining a growing collection of shell scripts to configure and launch different servers. MLX models were consistently much faster on Apple Silicon, but the runtime was less stable: memory pressure from larger quantized models could trigger loops, crashes, and on a bad day a full kernel panic that took the whole machine down. Every setup also had different flags, startup commands, and assumptions, and before long I was spending more time managing inference than using it. Since many models are published in both formats, I wanted to switch between them depending on the task. Athanor lets me switch between GGUF and MLX without caring which runtime is underneath.

The real challenge starts once you move beyond a single static endpoint. The cloud solved this years ago: managed endpoints, routing, lifecycle management, health checks, and observability. You point a client at a URL and it works. Local inference is the opposite: ad hoc binaries, ports chosen at random, startup scripts in your shell history, cache directories that drift. The gap between "a model exists on this machine" and "something can reliably talk to it" is an operational problem, and today most people bridge it with shell scripts.

The question stopped being "how do I run a model locally?" and became: **how do I make local models feel boring enough to use every day?**

### The workflow I wanted

The way I work with frontier models is pretty fluid. Depending on the task, I switch between different agents. At work, that might be [Snowflake's Cortex Code](https://www.snowflake.com/en/data-cloud/cortex/), [Claude](https://claude.ai/), or [Cursor](https://www.cursor.com/). On my personal machine, I wanted that same ability to swap models for local inference. Today, I do this with [pi-agent](https://github.com/badlogic/pi-mono), a terminal-based agent client, and Athanor. I chose pi-agent because it is minimal: its small system prompt keeps context overhead low, yielding high throughput when serving models locally.

Athanor routes all traffic through a single OpenAI-compatible endpoint at `127.0.0.1:8080`. When I select a different model in pi-agent, the ingress holds the client request open while the supervisor swaps the processes. It spins down the active model to free up unified memory, boots the new one, and runs a health check before forwarding the request. Because pi-agent is stateless and re-sends the full message history on each query, my entire conversation context follows me across the switch. Loading takes just a few seconds for a 9B model, and up to a minute for a 35B MoE. You might need to bump your client's timeout limit, but it is a small price to pay to swap models on a single port.

Once this is in place, a few problems simply disappear:

- **The client never sees the swap.** Every model gets a stable internal port on first discovery, but downstream clients only ever talk to the single ingress proxy. Athanor hot-swaps the backing process without the client losing its connection or needing reconfiguration.
- **Configuration is state, not history.** The presets, context windows, and startup flags live in Athanor's configuration, not your shell scrollback history.
- **Cached models are auto-discovered.** If a model is already in your [Hugging Face](https://huggingface.co/) cache (whether pulled intentionally or downloaded by another tool during typical usage), Athanor finds and registers it automatically.
- **Discovery and fit checks are automated.** Sizing calculations are built directly into search, preventing multi-gigabyte downloads that exceed your Mac's available memory.

The workflow I wanted was simple: search for a new model, confirm it fits my hardware budget, and pull it down. The moment it's registered, it's available to pi-agent. I switch to it and start working without touching a port or a config file.

### The TUI in practice

While the CLI is useful for scripting, I spend almost all of my time in the TUI. I just type `athanor` and it lists my registered models, their ports, and whether they are running. The interface keeps running processes, logs, and metrics visible while you work in your editor.

Because the TUI is decoupled from the process lifecycle, you can close and reopen it at any time without affecting the active model. If a model is running, it continues serving in the background. Reopening the TUI simply reattaches to the background processes, instantly restoring logs and metrics. Similarly, you can swap models from your agent client whether the TUI is open or not, as the background service handles the transition independently.

### Discovery and hardware fit

Finding a model is easy. Figuring out whether it has an MLX conversion and whether it will fit in your Mac's unified memory is not. I built search directly into Athanor to automate that part.

From the TUI, press `S` to browse the Hugging Face Hub without leaving the model list, and sort results by how well they fit your Mac's available memory. To help with sizing, Athanor's empty state shows curated starter suggestions grouped by memory size (8GB, 16GB, or 32GB+), so you know what is safe to run before starting a multi-gigabyte download. Selecting a result downloads and registers the model in one step. The same search and fit-sorting is available from the CLI too, via `athanor search`, `athanor trending`, and `athanor pull`, if you want to script it.

### The boring details that turned out to matter

None of these ideas are particularly novel on their own. What surprised me was how much the small operational details mattered once they were all working together.

**The ingress port is the only contract that matters.** Everything described above (swapping models, editing presets, restarting a serving process) happens behind `127.0.0.1:8080` without the downstream agent client ever needing to know. That single point of stability is what let me stop thinking about the rest of the stack.

**Process lifecycle reattaching** keeps the serving layer durable. Athanor launches runtimes as detached background processes, tracking their PIDs in `~/.athanor/state.json`. The serving process runs independently of whichever window or terminal you used to launch it. You can close your terminal entirely; the model continues serving in the background. Reopening the TUI or running a CLI command simply reattaches to the background processes dynamically, tailing logs and metrics.

**OpenAI compatibility** has real edge cases. A lot of local runtimes are close enough that most tools can talk to them, but "close enough" isn't the same as "reliably works." The exact model id matters. The URL shape matters. The capability flags matter. The difference between technically compatible and dependably compatible is entirely in the details.

**Non-destructiveness** is a design constraint, not an afterthought. If you already have other providers configured in pi-agent, Athanor leaves them alone. If a model is already in the Hugging Face cache, Athanor discovers it rather than ignoring it. The whole point of the operational layer is to respect the state you already have.

**Atomic registry writes** protect against catalog corruption. The model registry and your custom presets live in `~/.athanor/models.json`. Athanor always writes this file atomically via a temp-file and rename sequence. A crash mid-save will never leave you with a corrupted registry. Rescans only update paths and sizes; your custom presets, stable ports, and aliases survive untouched.

### Why call it athanor?

Historically, an athanor was an alchemical furnace designed for steady, continuous heat and long-running transformation. That metaphor maps directly to the system architecture:
- **Continuous operation:** The background service keeps running, so the fire never goes out.
- **Controlled change:** You swap models from your agent client without breaking the downstream connection.
- **Tending to the setup:** Working with local models requires active tuning. Finding the right balance of quantization, context windows, and memory limits is about finding equilibrium, not maxing out a single knob.

Alchemists spent years observing outcomes and adjusting their setups. They were not doing one-shot transmutations. Changing models with Athanor is basically changing the alchemical material without disturbing the reaction. The weights are just files on your SSD. The real alchemy is the workflow: it is the space you build to think.

### Building with a constraint

I put a constraint on myself for this project: no paid inference. Not because I couldn't afford it, but because the constraint forced me to work across a wide range of tools, models, and agents instead of defaulting to whatever was easiest. Everything had to run on some kind of free plan, trial, or credit balance. Early iterations were mostly [ChatGPT](https://chatgpt.com/) and Claude for specs, with Augment Code's [Auggie](https://github.com/augmentcode/auggie) doing the actual implementation. I later moved to pi-agent with [Azure-hosted GPT](https://azure.microsoft.com/en-us/products/ai-services/openai-service), and used Antigravity with Claude Sonnet for bigger refactors. For smaller iterations, I've been running Athanor-hosted Qwen 3.6 against the codebase itself, the tool bootstrapping its own development.

One pattern came out of the constraint: **use a frontier model on a free plan to write a spec, then hand that spec to a local model to implement.** The constraint forced precision in the spec, because a local model won't fill in the gaps the way a frontier model will. That surprised me. Local models became dramatically more useful once I stopped expecting them to invent requirements for me.

The [fractal simulator](https://github.com/MylesBorins/fractal) I built with Athanor and pi-agent followed the pattern more strictly: frontier models on the free tier for the spec, and local models alone for every line of implementation.

### Getting started

Ready to start your own alchemy? You'll need an Apple Silicon Mac and [Node.js](https://nodejs.org/) 22+ to run Athanor itself, plus at least one backend runtime: `mlx_lm.server` or `mlx_vlm.server` for MLX models, or `llama-server` for GGUFs.

To simplify the setup, the repository includes an `AGENTS.md` designed specifically for coding agents rather than humans. If you use an agent, you can delegate the entire configuration process:

1. Clone the repository:
   ```bash
   git clone https://github.com/MylesBorins/athanor.git
   ```
2. Open the folder with your agent of choice.
3. Ask it to get started. The agent will read `AGENTS.md` and automate the rest of the setup.

Most documentation assumes a reader who can infer intent and ask follow-up questions, which an agent cannot do. This document behaves like a decision tree: it guides the agent to confirm Apple Silicon via `uname -m`, calculate actual available memory by parsing `vm_stat` (accounting for active, wired, and reclaimable cache pages), and select models that fit within that budget. The memory heuristic is baked in: roughly 0.6 GB per billion parameters for a 4-bit quant, plus 6 to 8 GB of headroom for macOS.

If you are setting things up manually, install the backend runtimes yourself and use `npx athanor doctor` to check your PATH. You can also install the package globally using `npm install -g athanor` to run commands directly. Running `athanor doctor --check-updates` compares your local binaries against upstream releases and suggests upgrades, which is a regular part of my workflow since the MLX ecosystem moves fast.

### What I'm currently running

These days I mostly rotate between four models: Gemma 4 12B in both [MLX](https://huggingface.co/mlx-community/gemma-4-12B-it-8bit) and [GGUF](https://huggingface.co/unsloth/gemma-4-12b-it-GGUF) form, and Qwen 3.6 in both its [27B dense](https://huggingface.co/unsloth/Qwen3.6-27B-GGUF) and [35B MoE at 3-bit](https://huggingface.co/unsloth/Qwen3.6-35B-A3B-UD-MLX-3bit) variants, so I can compare runtimes and quants on the same tasks. Vision-capable models serve as text-only by default to avoid dealing with heavy PyTorch dependencies; flipping the flavor command (`athanor flavor <slug> vlm`) routes them to `mlx_vlm.server` instead when I actually need image inputs.

For tuning, Athanor has a preset system where each model carries its own overrides that survive rescans. For GGUF models: context window size, batch size, and GPU layer offloading. For MLX: prefill step size, prompt cache, and sampling parameters. Built-in recipes (`balanced`, `fast`, `quality`, `coding`, `long-context`) give you a starting point and you can layer your own on top.

That's really the point of Athanor. It isn't trying to replace the incredible work happening in runtimes like MLX or llama.cpp. It's trying to make them disappear behind a stable operational interface, so local inference starts to feel less like a collection of tools and more like infrastructure.
