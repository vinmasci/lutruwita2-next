# Photo Clustering Facts

## Regular Version (clustering.ts)

1. Uses supercluster with settings:
```typescript
maxZoom: 20,
minZoom: 0
```

2. Passes zoom to supercluster with:
```typescript
const clusters = index.getClusters(bounds, Math.floor(zoom)) as PhotoOrCluster[];
```

## Presentation Version (photoClusteringPresentation.ts)

1. Uses identical supercluster settings:
```typescript
maxZoom: 20,
minZoom: 0
```

2. Uses identical code to pass zoom:
```typescript
const clusters = index.getClusters(bounds, Math.floor(zoom)) as PhotoOrCluster[];
```

## What We Know About Supercluster

1. When you pass zoom=0 to getClusters(), it does MAXIMUM clustering
2. When you pass zoom=20 to getClusters(), it does NO clustering

## Current Behavior

1. Regular version:
   - Works as expected
   - Shows singles when zoomed in
   - Shows clusters when zoomed out
   - Maintains proper React component identity between updates

2. Presentation version:
   - Not working as expected
   - Even though code is identical
   - React loses track of components between updates due to undefined photo IDs
   - Error: "Warning: Encountered two children with the same key, `photo-undefined`"

## Key Discovery

The issue is not with the zoom level or clustering logic, but with React's component identity tracking:

1. The presentation version has undefined photo IDs
2. This causes React to generate duplicate keys (`photo-undefined`)
3. React cannot maintain component identity between updates
4. This prevents proper re-clustering as React can't track which photos were previously clustered
5. The error message confirms this: "Keys should be unique so that components maintain their identity across updates"

The solution would be to ensure all photos have valid IDs in the presentation version, so React can properly track component identity between updates.
