# Location-Based Filter Chips Implementation Plan

## 1. Feature Overview & Requirements

**Goal:** Implement location-based filter chips on the `HomeView` to allow users to easily filter routes by country and state, and navigate the map to the selected region's bounds.

**Key Requirements:**
- Display a horizontal scrollable row of location chips above the existing filter pills.
- Default country: Australia (AUS), shown as a red chip when selected.
- When a country (e.g., AUS) is selected, display its available states (e.g., TAS, VIC) as black chips.
- Selecting a state chip turns it red.
- Selecting a country or state chip:
    - Zooms/pans the map to the bounds of that geographic region.
    - Filters the displayed routes to that region.
- An "Other" chip before "AUS" to open a modal/drawer for selecting other countries.
- Remove the current "zoom to user location" logic on `HomeView` load.

## 2. Current System Analysis

- **`HomeView.swift`**:
    - Contains existing filter pills for route type and distance.
    - Has commented-out code for a previous country selector.
    - Uses `RouteListViewModel` for fetching and filtering routes.
    - Manages `cameraPosition` for the Mapbox map.
    - `LocationManager` is used for user location (this part will be modified).
- **`RouteListViewModel.swift`**:
    - Contains `@Published` properties: `selectedCountry: String?` and `selectedState: String?`.
    - `loadRoutes()` method already incorporates `selectedCountry` and `selectedState` into Firebase queries.
- **`RouteModels.swift`**:
    - `RouteMetadata` struct contains optional `country: String?` and `state: String?` fields.
- **Firebase**:
    - Route documents are expected to have `country` and `state` fields in their metadata for server-side filtering.

## 3. Architecture & Data Structures

### 3.1. Geographic Data Model
We need a way to store country and state information, including their abbreviations, full names, and map bounds.

```swift
// Proposed struct for geographic regions
struct GeographicRegion: Identifiable, Hashable {
    let id = UUID()
    let name: String // Full name, e.g., "Australia", "Tasmania"
    let abbreviation: String // e.g., "AUS", "TAS"
    let type: RegionType // .country or .state
    let bounds: MapboxMaps.CoordinateBounds // For map navigation
    let parentCountryAbbreviation: String? // For states, e.g., "AUS"
    var states: [GeographicRegion]? // For countries, list of their states
}

enum RegionType {
    case country
    case state
}

// Example Data (to be stored likely in a new utility file or within the ViewModel)
let australia = GeographicRegion(
    name: "Australia",
    abbreviation: "AUS",
    type: .country,
    bounds: CoordinateBounds(southwest: CLLocationCoordinate2D(latitude: -43.6345, longitude: 113.3389),
                             northeast: CLLocationCoordinate2D(latitude: -10.6686, longitude: 153.5694)),
    parentCountryAbbreviation: nil
)

let tasmania = GeographicRegion(
    name: "Tasmania",
    abbreviation: "TAS",
    type: .state,
    bounds: CoordinateBounds(southwest: CLLocationCoordinate2D(latitude: -43.6430, longitude: 143.8340),
                             northeast: CLLocationCoordinate2D(latitude: -39.1920, longitude: 148.5340)),
    parentCountryAbbreviation: "AUS"
)

// ... other states and countries
```

### 3.2. State Management
- **`RouteListViewModel`**:
    - `@Published var selectedCountryRegion: GeographicRegion?`
    - `@Published var selectedStateRegion: GeographicRegion?`
    - `@Published var availableCountries: [GeographicRegion] = []` (populated from route data or predefined list)
    - `@Published var availableStatesForSelectedCountry: [GeographicRegion] = []`
- **`HomeView`**:
    - Will observe these properties from `RouteListViewModel`.
    - Will update `cameraPosition` based on selected region's bounds.

## 4. Implementation Phases

### Phase 1: Data Model & Geographic Definitions
- **Step 1.1**: Define `GeographicRegion` and `RegionType` structs.
- **Step 1.2**: Create a new utility file (e.g., `GeographicData.swift`) to store predefined `GeographicRegion` instances for Australia and its states (TAS, VIC, NSW, QLD, SA, WA, NT, ACT). Include abbreviations and accurate `CoordinateBounds`.
    - *Note*: Bounds can be obtained using online tools or by manually defining them.
- **Step 1.3**: Add placeholder bounds for other potential countries if known.

### Phase 2: ViewModel Enhancements
- **File**: `mobile/CyaTrails/CyaTrails/ViewModels/RouteListViewModel.swift`
- **Step 2.1**: Add new `@Published` properties:
    - `selectedCountryRegion: GeographicRegion?`
    - `selectedStateRegion: GeographicRegion?`
    - `availableCountries: [GeographicRegion]`
    - `availableStatesForSelectedCountry: [GeographicRegion]`
- **Step 2.2**: Modify `loadRoutes()`:
    - When `selectedCountryRegion` changes, update `selectedCountry` (String) for Firebase query.
    - When `selectedStateRegion` changes, update `selectedState` (String) for Firebase query.
    - Populate `availableCountries` based on distinct countries found in fetched routes or use a predefined list.
- **Step 2.3**: Implement logic to update `availableStatesForSelectedCountry` when `selectedCountryRegion` changes.
    - This will involve looking up the states from the predefined `GeographicData`.
- **Step 2.4**: Ensure `resetFilters()` clears `selectedCountryRegion` and `selectedStateRegion`.

### Phase 3: Location Filter Chips UI
- **File**: Create `mobile/CyaTrails/CyaTrails/Views/LocationFilterChipsView.swift`
- **Step 3.1**: Create a new SwiftUI `View` called `LocationFilterChipsView`.
    - It will take `RouteListViewModel` as an `@ObservedObject` or `@EnvironmentObject`.
- **Step 3.2**: Implement the horizontal `ScrollView` with `HStack`.
- **Step 3.3**: Display the "Other" chip.
    - Action: Set a state variable to show the "Other Countries" modal.
- **Step 3.4**: Display the "AUS" chip.
    - Style: Red if `viewModel.selectedCountryRegion?.abbreviation == "AUS"`, otherwise black/default.
    - Action:
        - Set `viewModel.selectedCountryRegion` to the "AUS" `GeographicRegion`.
        - Set `viewModel.selectedStateRegion = nil`.
        - Trigger map camera update in `HomeView`.
- **Step 3.5**: If "AUS" is selected, display its state chips (TAS, VIC, etc.) from `viewModel.availableStatesForSelectedCountry`.
    - Style: Red if `viewModel.selectedStateRegion?.abbreviation == state.abbreviation`, otherwise black/default.
    - Action:
        - Set `viewModel.selectedStateRegion` to the selected state `GeographicRegion`.
        - Trigger map camera update in `HomeView`.

### Phase 4: HomeView Integration
- **File**: `mobile/CyaTrails/CyaTrails/Views/HomeView.swift`
- **Step 4.1**: Add `LocationFilterChipsView` to the `VStack` containing top controls, above the existing type/distance filter pills.
- **Step 4.2**: Modify `onAppear` logic:
    - Remove the automatic zoom to user's current location.
    - Set default `cameraPosition` to Australia's bounds if no country is selected, or to the selected country/state bounds.
- **Step 4.3**: Add `.onChange` observers for `viewModel.selectedCountryRegion` and `viewModel.selectedStateRegion`.
    - When these change, update `cameraPosition` to the `bounds` of the selected region.
    - Use `mapView?.mapboxMap.setCamera(to: CameraOptions(bounds: region.bounds))` or a similar method to fit bounds. Consider adding padding.
    - `mapView.camera.fly(to: cameraOptionsForBounds(region.bounds), duration: 1.0)` for smooth transition.

### Phase 5: "Other Countries" Modal
- **File**: Create `mobile/CyaTrails/CyaTrails/Views/OtherCountriesView.swift` (or similar name).
- **Step 5.1**: Design a modal/sheet view.
    - It will take `RouteListViewModel` as an `@ObservedObject` or `@EnvironmentObject`.
    - Display a list of `viewModel.availableCountries` (excluding Australia if it's handled by the main chip).
    - Optionally show route counts per country.
- **Step 5.2**: Implement selection logic:
    - Tapping a country sets `viewModel.selectedCountryRegion`.
    - Dismisses the modal.
- **Step 5.3**: In `HomeView`, add a `@State` variable like `showingOtherCountriesSheet = false`.
- **Step 5.4**: Present `OtherCountriesView` as a sheet when `showingOtherCountriesSheet` is true. The "Other" chip in `LocationFilterChipsView` will toggle this state.

## 5. Component Specifications

### `LocationFilterChipsView.swift`
- **Input**: `RouteListViewModel`
- **Output**: Updates `selectedCountryRegion` and `selectedStateRegion` in the ViewModel. Triggers presentation of "Other Countries" modal.
- **UI**: Horizontal `ScrollView` with styled `Button` or `FilterPillButton`-like views.

### `OtherCountriesView.swift`
- **Input**: `RouteListViewModel`
- **Output**: Updates `selectedCountryRegion` in the ViewModel.
- **UI**: List-based view within a sheet, showing country names.

### `GeographicData.swift` (Utility)
- Contains static definitions of `GeographicRegion` objects for known countries and states, including their bounds and abbreviations.

## 6. Integration Points

- **`HomeView.swift`**:
    - Instantiates and displays `LocationFilterChipsView`.
    - Responds to ViewModel changes to update map camera.
    - Manages presentation of `OtherCountriesView`.
- **`RouteListViewModel.swift`**:
    - Holds selected location state (`selectedCountryRegion`, `selectedStateRegion`).
    - Updates `selectedCountry` (String) and `selectedState` (String) for Firebase queries based on region selection.
    - Provides lists of available countries and states.
- **Mapbox Map in `MapViewRepresentable.swift`**:
    - `HomeView` will update its `cameraPosition` `@State` variable, which is bound to `MapViewRepresentable`. The `updateUIView` or an `onChange(of: cameraPosition)` in `HomeView` will trigger the map camera change.

## 7. Geographic Data & Bounds Definitions

- **Australia (AUS)**:
    - Bounds: `CoordinateBounds(southwest: CLLocationCoordinate2D(latitude: -43.6345, longitude: 113.3389), northeast: CLLocationCoordinate2D(latitude: -10.6686, longitude: 153.5694))`
- **Tasmania (TAS)**:
    - Bounds: `CoordinateBounds(southwest: CLLocationCoordinate2D(latitude: -43.6430, longitude: 143.8340), northeast: CLLocationCoordinate2D(latitude: -39.1920, longitude: 148.5340))`
- **Victoria (VIC)**:
    - Bounds: (To be defined)
- **New South Wales (NSW)**:
    - Bounds: (To be defined)
- ... (Other Australian states)
- **New Zealand (NZ)**: (Example for "Other")
    - Bounds: (To be defined)

*Accurate bounds are crucial for good UX. These can be refined during implementation.*

## 8. UI/UX Flow

1. User opens `HomeView`. Map defaults to showing Australia (or last selected region if persistence is added later).
2. Location chips are displayed: `[Other] [AUS (red)] [TAS] [VIC] ...`
3. User taps "TAS".
    - "TAS" chip turns red. "AUS" chip remains red (as parent).
    - Map animates to fit Tasmania's bounds.
    - Route list filters to show only Tasmanian routes.
4. User taps "AUS".
    - "AUS" chip is red. State chips might reset to black/default or last selected state remains red.
    - Map animates to fit Australia's bounds.
    - Route list filters to show only Australian routes (all states).
5. User taps "Other".
    - "Other Countries" modal appears.
    - User selects "New Zealand" from the list.
    - Modal dismisses. "NZ" (or similar) might appear as a selected chip, or "Other" chip highlights.
    - Map animates to New Zealand's bounds.
    - Route list filters to New Zealand routes.

## 9. Testing Strategy

- **Unit Tests**:
    - `RouteListViewModel`: Test filter logic with country/state selections. Test population of `availableStatesForSelectedCountry`.
    - `GeographicData`: Verify correctness of bounds and abbreviations.
- **UI Tests**:
    - Verify chip appearance (colors for selected/unselected).
    - Test tap actions on country and state chips.
    - Confirm map zooms correctly to selected region bounds.
    - Confirm route list filters correctly.
    - Test "Other" chip and "Other Countries" modal functionality.
- **Manual Testing**:
    - Test with various country/state combinations.
    - Test edge cases (no routes for a selected region, regions with no defined states).
    - Verify visual consistency and responsiveness.

## 10. Risk Assessment & Mitigation

- **Risk**: Inaccurate geographic bounds leading to poor map navigation.
    - **Mitigation**: Use reliable sources for bounds data. Test thoroughly. Allow for easy updates to bounds.
- **Risk**: Performance issues if fetching/calculating available countries/states is slow.
    - **Mitigation**: Optimize data structures. Consider pre-calculating or caching this data if dynamic fetching is too slow. For now, a predefined list for major regions is likely sufficient.
- **Risk**: Complexity in managing selected state vs. selected country.
    - **Mitigation**: Clear state management logic in `RouteListViewModel`. Ensure UI reflects the state accurately.
- **Risk**: User confusion if "Other" countries flow is not intuitive.
    - **Mitigation**: Design the "Other Countries" modal clearly. Provide feedback on selection.

This plan provides a comprehensive roadmap for implementing the location-based filter chips.
