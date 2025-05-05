# MapTiler Offline Maps Implementation - Part 1: Overview and Background

## Overview

This document outlines the implementation plan for switching from Mapbox to MapTiler for offline maps in the Lutruwita mobile app. The approach leverages our existing region-based architecture from the web app and provides a more reliable and user-friendly offline maps experience.

## Current Issues with Mapbox Implementation

Our current implementation has two approaches, both with significant challenges:

### 1. Mapbox Native SDK Approach (`mapboxOfflineManager.ts`)

- Using Mapbox's official offline pack APIs
- Requires a secret key (SK) token which is hardcoded
- Appears to be stalling during the "Creating offline region" step
- No clear error messages despite extensive debugging efforts
- Hitting the 750-pack limit in some cases

### 2. Manual Tile Download Approach (`mapTileStorage.ts`)

- Manually calculating tile coordinates and downloading individual tiles
- Using Expo's FileSystem.downloadAsync for each tile
- More control but very resource-intensive and potentially slower
- Generating 22,000+ tiles per route, which is inefficient

## Why MapTiler is a Better Alternative

### Existing Region Packs

Our web app already has a robust implementation of region-based tile loading with MapTiler:

- Well-defined geographic regions (Tasmania, Victoria North/South, NSW, etc.)
- Pre-processed vector tiles hosted on MapTiler
- Region detection based on route location

### Simpler Authentication

- MapTiler uses API keys rather than the more complex token system Mapbox uses
- No need for secret keys (SK) or public keys (PK) split
- Just one API key, or even go self-hosted

### Consistent Ecosystem

- Using the same tile provider across web and mobile provides consistency
- Leverage existing knowledge and infrastructure
- Same region definitions and detection logic

### Vector Tile Support

- MapTiler has good support for vector tiles, which we're already using for surface detection
- Can maintain the same styling across platforms

## Region-Based Download Approach

Instead of downloading tiles for individual routes, users would download entire geographic regions (Tasmania, Victoria North, etc.). This approach offers:

1. **Efficiency**: Download once, use for multiple routes in the same region
2. **Simplicity**: Clearer user experience ("Download Tasmania" vs. downloading individual routes)
3. **Consistency**: Matches our web app's region-based architecture
4. **Better caching**: Prevents duplicate downloads of the same tiles

See [Part 2](./MAPTILER_OFFLINE_MAPS_IMPLEMENTATION_PART2.md) for the implementation of the MapTiler Region Service.
