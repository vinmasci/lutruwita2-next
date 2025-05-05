# Road Surface Data Processing for Australia and New Zealand

This document outlines the methodology used to extract, process, and prepare road surface data for Australia and New Zealand to support a surface detection application.

## Data Source

We used OpenStreetMap (OSM) data from Geofabrik, which provides regularly updated extracts of the OSM database:
- [Australia OSM Data](https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf)
- [New Zealand OSM Data](https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf)

## Processing Workflow

### 1. Data Acquisition

Downloaded the raw OSM Protocol Buffer Binary Format (PBF) files:

```bash
wget https://download.geofabrik.de/australia-oceania/australia-latest.osm.pbf
wget https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf
```

### 2. Extracting Road Data

Used Osmium to extract road and highway features:

```bash
# Extract all road and highway features
osmium tags-filter australia-latest.osm.pbf w/highway -o australia-roads.osm.pbf
osmium tags-filter new-zealand-latest.osm.pbf w/highway -o nz-roads.osm.pbf
```

### 3. Regional Extraction

Divided Australia into states and territories using bounding boxes:

```bash
# Example for extracting the Northern Territory
osmium extract -b 129.0,-26.0,138.0,-10.5 australia-latest.osm.pbf -o regions/northernterritory.osm.pbf
```

We defined the following regions:
- Australian Capital Territory (ACT)
- New South Wales (NSW)
- Northern Territory (NT)
- Queensland (QLD)
- South Australia (SA)
- Tasmania (TAS)
- Victoria (VIC)
- Western Australia (WA)
- New Zealand (NZ)

### 4. Conversion to GeoJSON

Converted the road data to GeoJSON format for easier processing:

```bash
# Convert to GeoJSON
osmium export regions/northernterritory-roads.osm.pbf --output=regions/northernterritory-roads.geojson --output-format=geojson
```

### 5. Filtering and Property Selection

Created filtered versions with specific properties needed for surface detection:

```bash
# Filter to keep essential properties
jq '.features = [.features[] | select(.geometry.type == "LineString") | {type: .type, geometry: .geometry, properties: {highway: .properties.highway, surface: .properties.surface, name: .properties.name}}]' regions/victoria-roads.geojson > regions/victoria-roads-filtered.geojson
```

### 6. Geographic Subdivision

For larger regions (primarily Victoria and NSW), we split the data into geographic subregions to maintain manageable file sizes:

```bash
# Example of splitting Victoria into North and South regions
jq '.features = [.features[] | select(.geometry.type == "LineString" and (.geometry.coordinates[0][1] >= -36.5))]' regions/victoria-roads-filtered.geojson > regions/split/victoria-north.geojson

# Further subdivisions as needed
jq '.features = [.features[] | select(.geometry.coordinates[0][0] >= 145.0)]' regions/split/victoria-north.geojson > regions/split/victoria-northeast.geojson
```

Victoria was split into the following subregions:
- Northeast
- Northwest
- Southeast (further split into Part 1A, Part 1B, and Part 2)
- Southwest (split into East and West)

NSW was split into North and South regions.

### 7. Data Merging for Smaller Territories

For efficiency and to stay within hosting service limits, smaller territories were merged:

```bash
# Merging Northern Territory and ACT
jq -s '{ type: "FeatureCollection", features: ([.[0].features, .[1].features] | flatten) }' northernterritory-roads-filtered.geojson act-roads-filtered.geojson > regions/merged/nt-act-combined.geojson
```

### 8. Quality Assessment

For each region, we analyzed the quality and completeness of surface data:

```bash
# Check percentage of roads with surface information
total=$(jq '.features | length' region-roads-filtered.geojson)
with_surface=$(jq '.features | map(select(.properties.surface != null)) | length' region-roads-filtered.geojson)
percentage=$(echo "scale=1; $with_surface / $total * 100" | bc)
echo "Surface information: $with_surface out of $total roads ($percentage%)"
```

Our analysis showed varying levels of surface data coverage:
- ACT: 55.7%
- Northern Territory: 40.3%
- NSW: 44.7%
- Queensland: 52.4%
- South Australia: 49.4%
- Tasmania: 61.0%
- Victoria: 41.6%
- Western Australia: 42.3%

## Hosting Strategy

The processed data was prepared for hosting on mapping platforms with consideration for:

1. **File size limitations**: Most platforms have per-file size limits (commonly 300-500MB)
2. **Geographic organization**: Splitting data geographically ensures users only need to load relevant regions
3. **File count limits**: Some plans limit the number of datasets, requiring strategic merging of smaller regions

## Final Data Structure

The final processed data consists of:
- Victoria: 8 geographic subregions
- NSW: 2 geographic subregions
- Other Australian states/territories: 5 separate files
- NT and ACT: 1 combined file
- New Zealand: 1 file

## Tools Used

- **Osmium**: For extracting and filtering OSM data
- **jq**: For processing GeoJSON files
- **Shell scripts**: For automating the workflow

## Conclusion

This processing methodology allowed us to transform raw OSM data into optimized, region-specific datasets with surface information for road segments. The geographic organization enables efficient data loading in the application, and the careful splitting and merging strategy ensures compatibility with hosting service limitations.

The resulting datasets contain sufficient surface information (40-60% of roads) to support accurate surface detection throughout Australia and New Zealand.

## Implementation Status

All processed datasets for Australia and New Zealand have been successfully integrated into the application. The surface detection feature now works across all Australian states and territories as well as New Zealand, providing users with accurate information about paved and unpaved road sections throughout the entire region.

The implementation details can be found in the `vectorTileService.js` file, which dynamically selects the appropriate tileset based on the geographic location of the route. The system handles routes that cross between regions by loading tiles from multiple sources as needed.
