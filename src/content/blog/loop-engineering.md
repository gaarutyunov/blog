---
title: "Agentic Engineering: Part 1"
description: "How I started, first steps"
pubDate: 2026-08-01
tags: ["claude-code", "github", "loop-engineering"]
---

This is the first part of the three part series introducing my Claude Code setup for pet projects.

TODO: add TOC here

My journey with agentic engineering did not start at work with executives forcing me to use Claude Code or with code completion.
I have used Github Copilot before, but I never liked it, it never made me more productive.
It started with Claude Mobile App in October 2025 because I finally had a way to code everywhere.

After that happened I would split my journey into the following progression:

1. Interactive Demo-driven Coding
2. Spec-Driven Development
3. Claude Github Action Era
4. Harness Engineering
5. Loop Engineering

It wasn't this linear, but each part was about a skill that's really important to be able to get somewhere.

# The feedback loop

In my opinion the thing that affects the most the effectivenes of the engineering process is the feedback loop.
There are a lot of ways to shorten the feedback loop:
write SPECs, decompose, write tests, debug, show a demo, add observability, and so on.
The main reason for all this is to be able to decrease the uncertainty at each step to make sure that the end result works as expected.

When you first start vibe-coding you get results really quickly.
Although the feedback loop is short at start, as the complexity rises it becomes less efficient.

Since I started on my phone, there was no way to run the server locally and see the result.
Therefore, I always used some kind of demo on Github Pages.
This way I could make sure it actually worked.
For my latest projects involving Postgres, I even run PGLite in the browser. 

1. The feedback loop is very important. You need to see results at each step. People also call it vertical planning. Having a demo on each milestone is the best way to see the result.

I have been using Claude Code since they launched their mobile app in October 2025.
It was a game changer for me, because I finally could code everywhere.

The first thing I built was Malaga bike lanes [navigator](https://gaarutyunov.github.io/malaga-bike/). 
I found a government database with geojson of the bike lanes.
I needed it because I started riding a bike to work and Google Maps were quite outdated in that matter
and are really bad for bike navigation.
I have used it quite some times when I needed to go somewhere on bike.

At some point I started using Claude Research and formulating a spec before starting coding,
and my session turned more automonous.
I would just start the agent and wait for it to work through it end to end.
Then just test the deployed version and go back and forth until it worked.

Then they launched the Github app and I mostly stopped using the mobile app.
I would just formulate a spec, split it into tasks and launch claude in the comments.
It was buggy as hell tho, it could get stuck and not push the changes or not create a PR.
Sometimes it would run for an hour, the temporary Github token would expire and the agent couldn't push the result.
But I couldn't go back to the mobile app, since the `Spec -> Decomposition -> Issue -> PR -> CI -> Review -> Merge` flow felt so natural.
As a Team Lead I was just applying all the knowledge I had to orchestrate the agents instead of people.

Another downside with both approaches was the tooling.
I was coding with Rust and TypeScript mostly at this point and even cargo wasn't available in the sandboxes.
Because of this the feedback loop was quite big.
The CI had to run until it showed that nothing was working.
I had to copy-paste the output, because most of the github tools were also not available in Claude mobile before (or maybe I just didn't know about them).

I tried renting a server on Hetzner, configuring the action runner there and it got a bit better.
But with all the projects beeing hacked (trivy, litellm), even Github warned about using self-hosted runners for public repositories because forks could get access to the secrets.
Apart from it, paying for both the Claude subscription and the server is a bit too much. 

Dispatch just never worked on my old Macbook for some reason, so I haven't tried it.
In addition I didn't want to code interactively, I liked the asynchronous nature of the proper [AC/DC](https://www.sonarsource.com/blog/the-future-of-software-development-is-acdc/).
At this point a lot of orchestrations were already available, such as [gastown](https://github.com/gastownhall/gastown).
But it also didn't work, no idea why, Claude also couldn't figure it out — it happens some time with vibe-coded tools.
I also had a custom purely Claude framework with YAML files for state and subagents, skills, etc.
It worked fine but was pretty unstable.
I kind of had an idea of writing some custom tool that would work for me, but never had time for it.

All the frustration ended when Claude introduced loops.
Finally, Claude would mantain attention on the workflow.
It wasn't a skill loaded at some point during the session.
It's essentially a prompt that appears every tick in the context and drives LLM attention to the instructions in it.
I have previosly tried the Ralph loop and it worked even better.
This motivated me to finally build my harness around the notions I have picked up experimenting with different approaches.

# The harness

I started applying all the knowledge to build my autonomous software factory.
The first thing I did was create a Github project (for task tracking) and the [workspace](https://github.com/gaarutyunov/workspace) repository.
No YAML files nor beads for task tracking. Now everything lived in Github tasks.
No idea why I was inventing the wheel with some custom local things if all the necessary tools already existed.

Then I installed a bunch of skills I have used for development, like [golang-pro](https://www.skills.sh/jeffallan/claude-skills/golang-pro), [tdd](https://www.skills.sh/mattpocock/skills/tdd), etc. You can check the full list in the workspace repository. Then I installed [gortex](https://github.com/zzet/gortex). I have previosly used [serena](https://github.com/oraios/serena) and [contextplus](https://github.com/ForLoopCodes/contextplus), but gortex combines both of their feature sets and is written in Go.

When the foundation was laid out, I started configuring the loops.
The main idea of my loops is that they are a state machine, essentially how asynchronous Tasks work.
Each tick the loop uses a custom script that fetches the state of the world:
all the Github issues from the project in workable statuses, the comments from them,
linked pull requests, their CI state, comments from them.
In each issue it mantains the [loop state](https://github.com/gaarutyunov/gopgql/issues/38#issuecomment-5084841300) to track what was already addresses and where it is now.
I don't map the Tasks states directly to the loop states, because they evolve a lot.
I just use labels and the loop state for now.

I ended up with two loops: [auto](https://github.com/gaarutyunov/workspace/blob/main/.agents/skills/auto-loop/SKILL.md) and [hitl](https://github.com/gaarutyunov/workspace/blob/main/.agents/skills/hitl-loop/SKILL.md). 
auto loop is fully autonomous it picks up issues, works through them and merges once the CI is green.
I use it when I have a detailed spec with milestones where I am sure about the definition of done and I just want the final result that I could fix later.

The hitl (human-in-the-loop) has several review gates: the spec gate and the PR gate where I review the code and the demo. I mostly use it after the auto loop has performed the majority of work and laid out the foundaiton.
I have let these loops run on my laptop for a couple of weeks now and I am pretty happy with the results.
They have coded all the pet projects I have listed on my [website](https://garutyunov.com/).
Of course, there is room for improvement but overall it's working.
I will talk about ideas that I have to improve them in my next blog.
