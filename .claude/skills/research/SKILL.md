---
name: research
description: Deep research on any topic — technical, business, legal, market analysis
category: atomic
tools: [WebSearch, WebFetch, Read, Bash]
---

# Research

## Purpose

Conducts thorough research on any topic using web search and page fetching. Covers technical documentation, business analysis, legal questions, market research, and competitive analysis. Use when you need current, verified information beyond your training data.

## Prerequisites

- WebSearch and WebFetch tools available
- Clear research question or topic defined

## Workflow

### 1. Define the Question

Before searching, articulate exactly what you need to know. Vague questions produce vague results. Break broad topics into specific sub-questions.

Bad: "Tell me about OAuth"
Good: "What are the security differences between OAuth 2.0 authorization code flow and PKCE for SPAs?"

### 2. Search Strategy

| Research Type | Search Approach |
|--------------|----------------|
| **Technical** | Search official docs first, then Stack Overflow, then blog posts. Prefer primary sources. |
| **Business/Market** | Search industry reports, company blogs, press releases. Cross-reference multiple sources. |
| **Legal** | Search official regulatory sites, law firm analyses, government publications. Flag that you are not providing legal advice. |
| **Competitive** | Search product pages, pricing pages, review sites, comparison articles. |
| **Current events** | Search news sites, official announcements, social media summaries. |

### 3. Gather and Verify

- Use WebSearch to find relevant pages
- Use WebFetch to read the full content of promising results
- Cross-reference claims across at least 2 sources
- Note publication dates — stale information is dangerous for fast-moving topics
- Prefer official documentation over third-party summaries

### 4. Synthesize

- Summarize findings in a structured format
- Clearly separate facts from opinions
- Note confidence level: high (multiple authoritative sources agree), medium (some sources, some ambiguity), low (limited or conflicting information)
- Include source URLs for key claims

## Examples

**Technical research — choosing a library:**
1. Search: "[library A] vs [library B] 2025 comparison"
2. Fetch official docs for both, compare feature matrices
3. Search GitHub issues for known problems
4. Summarize: features, performance, community health, recommendation

**Market research — pricing a product:**
1. Search: "[product category] pricing 2025"
2. Fetch competitor pricing pages
3. Search for industry benchmarks and willingness-to-pay studies
4. Summarize: price ranges, common models (subscription/one-time/freemium), recommendation

## Gotchas

- **Web search results can be outdated.** Always check publication dates. A "best practices" article from 2019 may recommend deprecated approaches.
- **SEO-optimized content is not authoritative content.** Prefer official docs, RFCs, and primary sources over content-farm blog posts.
- **Don't over-research.** Set a time budget. If you can't find the answer in 5-10 searches, the question may need to be refined or the answer may not be publicly available.
- **Legal research is not legal advice.** Always flag this explicitly. Recommend consulting a professional for legal, tax, and compliance questions.
- **API documentation on the web may not match the version you're using.** Always verify against the docs for your specific version.
