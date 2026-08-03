# Noodle Seed official-directory plugin

This portable directory is the single submission source for Claude and OpenAI plugin directories.
It declares one remote MCP, `noodle-developer`, and ships the shared adaptive `noodle-seed` skill.
Claude and OpenAI receive their native plugin manifests from this same generated root.
When a host does not expose the local `noodle-readiness` MCP, the skill privately invokes the
release-pinned packaged launcher and continues to report only public `noodle ...` commands.

The direct coding-agent marketplace plugin remains a separate projection of the same source and
continues to declare both `noodle-developer` and `noodle-readiness`.
