# Agents

This project is a Jekyll blog hosted on GitHub Pages (jemonjam.com).

## Constitution Reference

This project follows the engineering principles outlined in the [Engineering Constitution](./agent-instructions/coding/constitution.md). The relevant principles for this context:

- **Simplicity over cleverness** - Write obvious, clear content and code
- **Single responsibility** - Each post should have a focused thesis
- **Explicit error handling** - If building interactive elements (simulations, embeds), handle edge cases gracefully

## Project Structure

- `_posts/` - Published blog posts (format: `YYYY-MM-DD-slug-title.md`)
- `_drafts/` - Work-in-progress posts
- `_layouts/` - HTML templates (`post`, `default`, `bare`)
- `_includes/` - Reusable template components
- `_config.yml` - Jekyll configuration

## Blog Post Format

Posts use YAML frontmatter:
```yaml
---
title: Post Title
layout: post
group: blog
description: >
    Brief description
---
```

## Writing Style

See [writing style guide](./agent-instructions/writing/writing_like_jacob.md) for Jacob's voice and tone.

## Quality Assessment

Use [writing assessment rubric](./agent-instructions/writing/writing_assessment_rubric.md) to score posts.
Target: LLM Score < 30, Jacob Score > 65.
