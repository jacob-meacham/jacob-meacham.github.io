---
title: "LGBTQ+ inclusive studios in New York | ClassPass"
description: "New York studios where LGBTQ+ community members feel welcomed and affirmed, according to real ClassPass community reviews."
keywords: ["lgbtq fitness new york", "inclusive studios new york", "classpass lgbtq new york", "queer friendly yoga new york", "affirming fitness spaces new york"]
page_type: audience_fit
city: New York
theme: LGBTQ+ Inclusive
status: SKIPPED
skip_reason: insufficient data
data_source: SCORE_COMMENTS keyword search across all New York MSA venues (MSA_ID 1)
extraction_method: SCORE_COMMENTS-FIRST -- theme-density ranking from LGBTQ+-keyword-filtered reviews (lgbtq, queer, trans, inclusive, pride, safe space, nonbinary, affirming, diverse, all welcome, accepting, everyone is welcome)
---

# Skipped -- insufficient data

## Summary

This page was not generated because fewer than three studios met the threshold for genuinely LGBTQ+-theme-relevant reviews.

## Extraction details

- **Query**: 80 candidate reviews returned from SCORE_COMMENTS joined with TOPS_CLASS_DATA for MSA_ID 1 (New York), filtered to ratings of 4+ and comments longer than 30 characters matching 12 LGBTQ+-related keywords.
- **Venues returned**: 70 unique venue IDs across the 80 reviews.
- **Venues passing 20+ review threshold**: 60 venues had 20 or more total reviews in the MSA.

## Filtering analysis

The 12 search keywords cast a deliberately wide net, but the vast majority of matches were false positives for the LGBTQ+ Inclusive theme:

### "trans" matches (most frequent trigger)
Nearly all matched "transitions," "transformative," "transformed," "transport," or "transcends" -- standard fitness vocabulary for describing class flow and personal progress. These are not LGBTQ+-relevant.

### "inclusive" matches
Reviews used "inclusive" to mean beginner-friendly, all-levels, or generally welcoming class environments (e.g., "Very inclusive and beginner-friendly," "inclusive of all levels," "inclusive for beginners"). None specifically referenced LGBTQ+ inclusivity.

### "pride" matches
Every match used "pride" in the sense of personal pride or professional pride (e.g., "takes pride in her work," "sense of pride for myself"). Zero references to LGBTQ+ Pride.

### "affirming" matches
All matches meant encouraging or motivating in a general coaching context (e.g., "positive and affirming," "affirming us by name"). None referenced identity-affirming spaces.

### "diverse" matches
Matches referenced body-size diversity, age diversity, or general participant variety. None specifically referenced LGBTQ+ diversity.

### "safe space" matches
Matches described feeling safe as a beginner, in a martial arts context, or in a yoga vulnerability context. One exception noted below.

### "accepting" matches
Used generically to describe studios welcoming of all fitness levels.

## Genuinely LGBTQ+-relevant studios found

Only **1 studio** had a review explicitly referencing LGBTQ+ identity:

| Studio | Venue ID | Total reviews | Relevant review excerpt |
|--------|----------|---------------|------------------------|
| Sacred Space Astoria | 111795 | 140 | "I felt safe when I was in there as a trans person. It was a very relaxing session." |

This is the only review across all 80 candidates that specifically names an LGBTQ+ identity or explicitly connects the studio environment to LGBTQ+ safety and belonging.

## Decision

**1 qualifying studio < 3 required. Page generation skipped.**

Generating a page with only one genuinely theme-relevant studio would not provide enough breadth to be useful to the target audience, and padding the page with studios whose "inclusive" or "diverse" reviews are generically fitness-related would misrepresent the data and potentially mislead LGBTQ+ community members seeking explicitly affirming spaces.

## Recommendations for future extraction

1. **Expand keyword list**: Consider adding terms like "rainbow," "gay," "lesbian," "bisexual," "two-spirit," "drag," "chosen family," or "gender-affirming" to capture a wider range of explicitly LGBTQ+ language.
2. **Cross-reference with venue metadata**: If studio profiles or tags indicate LGBTQ+-owned or LGBTQ+-focused businesses, those could be used as a secondary signal alongside review text.
3. **Revisit periodically**: As the review corpus grows, more explicitly LGBTQ+-themed reviews may accumulate, especially in a market as large as New York.
