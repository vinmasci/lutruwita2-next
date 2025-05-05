Offline

On this page
Limits
Specifying the style and areas that will be used offline
Working with downloads
Manage offline data
Understanding and configuring offline behavior
Potential risks on updating the offline style
Style pack transition to tile store in v11
If your user base spends most of their time off the grid, use the Mapbox Maps SDK's offline features to download and store pre-selected regions for use when there is a loss of connectivity. The maps they download will be fully functional and include the styles, tiles, and other resources you specify.

An offline map requires two main components:

Style data, which is organized into style packs. Use the Offline Manager API to manage style packs.
Map data, which is organized into preassembled tile packs. Use the tile store to manage tile packs.
These are a few key terms and concepts you may need to reference when working with offline maps:

Offline Manager: The Offline Manager API provides a configuration interface and entrypoint for offline map functionality. It is used to manage style packs and to produce tileset descriptors that can be used with a tile store.
Tileset descriptor: A tileset descriptor contains metadata about the tilesets, zoom ranges, and pixel ratio that cached tile packs should include. You can create tileset descriptors with the Offline Manager. Each time you create a tile pack, you will provide both a tileset descriptor and a tile region before tile data can be fetched for offline use.
Tile region: A tile region is a geographic area for which offline data is needed. Tile regions are used by tile stores to fetch and manage tile packs necessary to provide offline support in that area. To create a tile region, a developer must specify a geometry describing each region's boundaries, source tileset(s), and zoom range(s).
Tile pack: Tile packs are binary files made up of a parent tile and its descendant tiles covering a specific range of zoom levels and over a predefined geographic area. Because they have less per-tile and per-connection overhead, they are more efficient to transfer over the network and store on the file system than individual tiles. Tile packs only store tiles. The Offline Manager API handles metadata and descriptors related to tilesets.
Tile Store: The tile store manages retrieving and organizing tile packs. The Maps SDK uses the tile store for the offline data such as tile regions or style pack resources. The tile store does not share tiles with the disk cache (see note on disk cache below). Although the Offline Manager manages style packs and handles creating tileset descriptors, it is the job of the tile store to manage tile regions.
Style pack: A style pack contains a map style and the non-tile resources it depends upon, including loaded sources, fonts, sprites, and 3d models. Collectively, these resources are used to transform map data stored in tiles into a rendered map with a particular look and feel. Style packs are identified by their style URL.
Disk cache
When a user loads and interacts with a map on their device, any visible tiles and style resources (style JSON, fonts, sprites, etc.) are placed in the device's disk cache, which is located in the maps data directory defined in the MapsResourceOptions.dataPath. The disk cache observes when these resources are used and makes intelligent guesses about which resources may be needed again. When a user revisits a place on the map, it will load more quickly if the associated resources are still present in the disk cache, because the device will not have to request those resources from the server to render the map.Resources are not permanently stored in the disk cache. There are no guarantees about how long these resources will be cached, but the least-recently used resources are normally removed to make room for newer resources.
Limits

The cumulative number of unique maps tile packs used in the offline regions cannot be greater than 750. The SDK will not load tile regions if it would lead to exceeding the tile pack limit.

Our terms of service do not allow developers or end users to redistribute offline maps downloaded from Mapbox servers. Users of the SDK must retrieve Mapbox data intended for offline use from Mapbox servers--the data may not be preloaded, bundled or otherwise redistributed.

Specifying the style and areas that will be used offline

To render a complete map in an offline environment, the device needs to fetch two main components: a style and the required map tiles, each of which needs to be configured ahead of time.

Define a style pack

To render a map offline, the SDK must be able to fetch the non-tile resources that the map requires. This includes loaded sources, fonts, styles and sprites. The SDK calculates which resources it needs based on the StylePackLoadOptions you specify and pass to the Offline Manager API.

let options = StylePackLoadOptions(glyphsRasterizationMode: .ideographsRasterizedLocally,
                                   metadata: ["my-key": "my-value"],
                                   acceptExpired: false)
Define a tileset descriptor and tile region

The tileset descriptor associates tile data (stored in a tile pack) with a given style (stored in a style pack). Use the tileset descriptor to define a tileset's zoom ranges and pixel ratio.

The tile region is a geographic region and its metadata. It is used to calculate which tile packs will be necessary to provide offline functionality in that region.

// When creating an OfflineManager instance, you must ensure that
// an access token is initialised, if you are not using a default
// from the application's Info.plist
MapboxOptions.accessToken = accessToken

let offlineManager = OfflineManager()

// 1. Create the tile set descriptor
let options = TilesetDescriptorOptions(styleURI: .outdoors, zoomRange: 0...16)
let tilesetDescriptor = offlineManager.createTilesetDescriptor(for: options)

// 2. Create the TileRegionLoadOptions
let tileRegionLoadOptions = TileRegionLoadOptions(
    geometry: Geometry(coordinate: tokyoCoord),
    descriptors: [tilesetDescriptor],
    acceptExpired: false)
Metadata

You may provide arbitrary metadata for both style packs and tile regions. You may want to provide metadata to distinguish the various regions your users download from one another or for other record-keeping requirements within your app. This data will be associated with the style packs and regions that the system fetches and stores locally. While optional, providing a metadata object with at least a region name is encouraged. Besides a region name, you can store any arbitrary serializable information you'd like as long as it can be wrapped into a JSON object. For example, you might wish to store the record ID of a travel itinerary that a user has created in another part of your app, and for which the offline region is being retrieved, to link the two together. The contents of the metadata you specify will only be available inside your app and will not affect your tile region download.

Add metadata to the style pack with StylePackLoadOptions.

let metadata = ["my-key": "my-style-pack-value"]
let options = StylePackLoadOptions(glyphsRasterizationMode: .ideographsRasterizedLocally,
                                   metadata: metadata)
Add metadata to the tile region with TileRegionLoadOptions.

let metadata = [
    "name": "my-region",
    "my-other-key": "my-other-tile-region-value"]
let tileRegionLoadOptions = TileRegionLoadOptions(
    geometry: Geometry(coordinate: tokyoCoord),
    descriptors: [],
    metadata: metadata,
    acceptExpired: false)
Working with downloads

Once the above steps are complete, the system has the information necessary to know what to resources must be downloaded. The next step is to start downloads for each of your style packs and tile packs.

Download a style pack

Now that the StylePackLoadOptions has been created, you can use the OfflineManager to download a style pack asynchronously by calling loadStylePack. loadStylePack returns a Cancelable object, allowing you to abort the download by calling cancel().

To initialize the download, pass in the StylePackLoadOptions you created, as shown in both the Define a style pack and Metadata sections.

This will provide you with two callbacks:

StylePackLoadProgressCallback tracks the progress of the download.
StylePackCallback tracks the completion of the download or any errors that occur. It returns a StylePack object when the download completes successfully, which you can use to check the downloaded style package, including its expiration date.
// These closures do not get called from the main thread. Depending on
// the use case, you may need to use `DispatchQueue.main.async`, for
// example to update your UI.
let stylePackCancelable = offlineManager.loadStylePack(for: .outdoors,
                                                       loadOptions: stylePackLoadOptions) { _ in
    //
    // Handle progress here
    //
} completion: { result in
    //
    // Handle StylePack result
    //
    switch result {
    case let .success(stylePack):
        // Style pack download finishes successfully
        print("Process \(stylePack)")

    case let .failure(error):
        // Handle error occurred during the style pack download
        if case StylePackError.canceled = error {
            handleCancelation()
        } else {
            handleFailure()
        }
    }
}

// Cancel the download if needed
stylePackCancelable.cancel()
Download a tile region

In the previous step, you used the Offline Manager API to download a style pack. You will use the tile store in a similar way to download any tile packs required to render your map offline.

To create an asynchronous tile region download, call the tile store's loadTileRegion method and pass in the TileRegionLoadOptions you created, as shown in the Define a tileset descriptor and tile region and Metadata sections. loadTileRegion will return a Cancelable object, which may be used to abort the download.

loadTileRegion will provide you with two callbacks:

TileRegionLoadProgressCallback tracks the download progress.
TileRegionCallback tracks the completion of the download or any errors that occur. It provides a TileRegion object when the download completes successfully, which you can use to check the downloaded tile region, including its expiration date.
let tileRegionId = "my-tile-region-id"

// Load the tile region
let tileRegionLoadOptions = TileRegionLoadOptions(
    geometry: Geometry(coordinate: tokyoCoord),
    descriptors: [tilesetDescriptor],
    acceptExpired: true)!

let tileRegionCancelable = tileStore.loadTileRegion(
    forId: tileRegionId,
    loadOptions: tileRegionLoadOptions) { _ in
    //
    // Handle progress here
    //
} completion: { result in
    //
    // Handle TileRegion result
    //
    switch result {
    case let .success(tileRegion):
        // Tile region download finishes successfully
        print("Process \(tileRegion)")

    case let .failure(error):
        // Handle error occurred during the tile region download
        if case TileRegionError.canceled = error {
            handleCancelation()
        } else {
            handleFailure(error)
        }
    }
}

// Cancel the download if needed
tileRegionCancelable.cancel()
Manage offline data

Once a download has completed, you may want to give your users the option to view and manage their downloads in one place. The Offline Manager API and tile store each provide methods for listing and managing offline data.

List offline style packs and regions

The OfflineManager offers a allStylePacks(completion:) method which returns an Result type, encapsulating the array of style packs available or an error.

// Get a list of style packs that are currently available.
offlineManager.allStylePacks { result in
    switch result {
    case let .success(stylePacks):
        handleStylePacks(stylePacks)

    case let .failure(error) where error is StylePackError:
        handleStylePackError(error)

    case .failure(_):
        handleFailure()
    }
}
Similarly, the TileStore offers a allTileRegions(completion:) method which returns a Result type, encapsulating the list of tile regions available or an error.

// Get a list of tile regions that are currently available.
tileStore.allTileRegions { result in
    switch result {
    case let .success(tileRegions):
        handleTileRegions(tileRegions)

    case let .failure(error) where error is TileRegionError:
        handleTileRegionError(error)

    case .failure(_):
        handleFailure()
    }
}
Update a style pack

To maintain the integrity of a style package, the map style that belongs to an offline pack will not be automatically updated if a user returns to an area with network services and views the map while connected. This includes loaded sources, glyphs, sprites and 3D models.

You can manually refresh style packs using OfflineManager.loadStylePack, passing it the same StyleURI and an empty StylePackLoadOptions (note that if the acceptExpired flag is set, the existing outdated resources will not be refreshed). During the refresh, any missing resources will be loaded and expired resources will be updated.

Update a region

Downloaded tile regions can be refreshed using the same TileStore.loadTileRegion call you made when you initialized your download. Provide the same tile region ID (tileRegionId in the download initialization example above) and an empty TileRegionLoadOptions (note that if the acceptExpired flag is set the existing outdated resources will not be refreshed). During the refresh, any missing resources will be loaded and any expired resources will be updated.

Normally, the map does not load new tile packs from the network, unless MapboxMapsOptions.tileStoreUsageMode is set to .readAndUpdate. If MapboxMapsOptions.tileStoreUsageMode is set to .readAndUpdate, the map will replace the outdated visible tile packs with fresh ones for all the tile regions that refer to these tile packs.

Delete style packs and regions

To remove offline data from the database, you must first receive the list of tile regions as explained in the List offline style packs and regions section. Once this list has been retrieved it may be used to select the style pack and/or tile regions to be deleted.

Delete a style pack using the OfflineManager.removeStylePack API and the style's URI.

offlineManager.removeStylePack(for: .outdoors)
Note this may not immediately delete the downloaded style pack. Instead, it will mark the resources as not being a part of an offline style pack and they will be removed from the disk cache during its normal cleanup process.

You can delete a tile region with TileStore.removeTileRegion.

tileStore.removeTileRegion(forId: "my-tile-region-id")
Note that this may not immediately delete the downloaded tile packs. Instead, it will mark the tileset as not being a part of an offline tile region and they will be removed from the disk cache during its normal cleanup process.

You can fully remove tiles that have been downloaded by setting the disk quota to zero. This will make sure tile regions are fully removed. See the section entitled Tile store disk quota.

Understanding and configuring offline behavior

Understanding the default behavior and customization options of the Maps SDK's offline functionality can allow you to optimize your app's offline functionality and manage it more flexibly.

Each Map instance stores files for both the disk cache and tile store in a default location (normally, inside the application cache folder). To override the default, you can provide a custom data path for the disk cache and a tile store instance. There is only ever one tile store for each unique file path.

The Offline Manager can be configured using MapboxMapsOptions. You can completely disable the tile store by setting MapboxMapsOptions.tileStoreUsageMode to .disabled. In this case, a tile store will not be created and tile region functionality will not be available.

By default, a tile store is read-only and the Maps SDK only interacts with it to check for tiles it needs. If the necessary tile is not in the tile store, the SDK will request the individual tile and store it in the disk cache instead of the tile store. By default, the SDK will not fetch tile packs in scenarios like this, where a tile is not available locally and must be retrieved.

You can enable implicit tile pack loading by setting the MapboxMapsOptions.tileStoreUsageMode option. When set to .readAndUpdate, the map engine will use the tile store for loading tile packs rather than loading tiles individually. Only tile packs will be used. This option can be useful if the map trajectory is predefined and the user cannot pan freely (For example navigation use cases). In these circumstances, it is more efficient to use tile packs for all map data loading instead of allowing the map to request arbitrary tiles.

Tile store disk quota

By default, there is no limit to the size of a tile store. A quota can be configured with the TileStoreOptions.diskQuota option.

Tile store will refuse to store new data on disk if it would cause the quota to be exceeded. To make room for new content, tiles packs with the nearest expiration dates that aren't shared by another tile region will be removed before the quota is reached. By default, this happens when there are 50 Mb left.

Disk quota prior to Mapbox Maps SDK v11.2.0
Before Mapbox Maps SDK 11.2.0, removal of tile packs was triggered only after the quota was exceeded. Since tile packs that are part of a tile region wouldn't be removed, this could cause the tile store to grow permanently over the specified quota.
For instance, if you set TileStoreOptions.diskQuota to 500 Mb then nothing will be removed until the tile store size reaches 450 Mb. After that, tile store will start evicting tile packs with the nearest expiration date which are not part of any region to try to keep the size under 450 Mb. In case all tile packs belong to some region and nothing can be evicted, tile store may keep growing and use the entire quota of 500 Mb. After that no new tile packs can be added to the tile store and some regions would need to be removed or TileStoreOptions.diskQuota would need to be increased.

// Set a quota of 100 Mb. Tile store will try to keep it's size around 50Mb and will not allow to save
// new tile packs when tile store size is over 100Mb
tileStore.setOptionForKey(TileStoreOptions.diskQuota, value: 100 * 1024 * 1024)
Tile count granularity

The tile store loads and stores tiles in tile packs. Each tile pack has a predefined zoom range and contains all child tiles within that range. The tile leveling scheme for a tileset is determined in the TileJSON. The default tile pack zoom ranges are:

Global coverage: 0 - 5
Regional information: 6 - 10
Local information: 11 - 14
Streets detail: 15 - 16
When specifying minimum and maximum zoom levels as part of the TilesetDescriptorOptions, the actual zoom levels of the retrieved data will be determined by these ranges. For example, if you set minZoom to 8 and maxZoom to 15, the downloaded tiles will include zoom levels ranging from 6 to 16.

Supported tiled sources

Tile regions support only the tiled sources whose tile endpoint URLs correspond to the Mapbox Vector/Raster tile v4 URL schema or Mapbox Raster DEM tile v1 URL schema. Your tiled source probably uses the v4 URL schema unless it is more than a few years old.

Potential risks on updating the offline style

Changing the style currently in use in offline scenarios should be executed with great care to make sure that the existing loaded style packages and tile regions continue to function correctly after the update.

Modifications to the style layers that interact with the current style sources are typically safe. However, modifications to the style sources entail adjustments to the tiles in use, which could potentially cause previously-loaded tile regions to become incompatible with the updated style.

Composited sources

While source compositing helps to load the map faster during online usage, it introduces potential risks for offline scenarios.

In general, we recommend to disable source compositing when creating a styles for the offline usage to avoid known limitations listed below.

Rigid tile scheme in legacy Offline

For the legacy offline system (the deprecated OfflineRegionManager API), any modification of the bundled source URL makes existing offline regions incompatible. This occurs because tiles are stored using their URLs as resource keys. When source compositing is enabled, the tiles URL structure looks something like scheme://source_a,source_b. So, any updated URL, such as scheme://source_a,source_b,source_c or even scheme://source_b,source_a, is treated as an entirely different tile that does not apply for the style.

The new offline system always stores the tile packages independently for every tileset and thus it is not susceptible to the described issue.

Composited tile components do not go beyond scale

When a composited source consists of two or more components with different maximum zoom levels, there is a situation where, if the camera is displaying a zoom level higher than the maximum zoom of one of the source components, data from that particular source component will not be rendered.

This limitation arises because, for offline usage, source compositing is performed on the client side (from the stored tile packs data), and the implementation is constrained in comparison to server-side source compositing logic.

Style pack transition to tile store in v11

In v10, style packs were stored in the disk cache that is employed during normal online map use. In v11, style packs resources are stored in the tile store along with the tile packs, thus providing more holistic approach for storing of the offline resources. All previously existing style packs are migrated to the tile store on the update operation. This transition is performed transparently and requires no additional actions from the client.

For an existing style pack, the transition occurs after the successful completion of the OfflineManager.loadStylePack() call for the package. When all the resources are successfully loaded to the tile store the previous style package is removed from the disk cache.

Be aware that the resources are downloaded again from the server during the transition.

If, for any reason, you wish to keep the style pack in the disk cache after the transition, specify the "keep-legacy-style-pack" extra load option.

let options = StylePackLoadOptions(glyphsRasterizationMode: .ideographsRasterizedLocally,
                                   metadata: ["my-key": "my-value"],
                                   acceptExpired: false,
                                   extraOptions: ["keep-legacy-style-pack": true])