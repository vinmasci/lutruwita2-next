import SwiftUI
import CoreLocation
import MapboxMaps

struct MapView: UIViewRepresentable {
    @Binding var centerCoordinate: CLLocationCoordinate2D
    @ObservedObject var mapViewModel: MapViewModel
    var onMapTap: ((CLLocationCoordinate2D) -> Void)?
    
    func makeUIView(context: Context) -> MapboxMaps.MapView {
        // Get the Mapbox access token from the Info.plist
        let accessToken = Bundle.main.object(forInfoDictionaryKey: "MGLMapboxAccessToken") as? String ?? "placeholder_mapbox_access_token"
        
        // Create the map view with the access token
        let options = MapInitOptions(
            resourceOptions: ResourceOptions(accessToken: accessToken),
            cameraOptions: CameraOptions(center: centerCoordinate, zoom: mapViewModel.zoomLevel)
        )
        
        let mapView = MapboxMaps.MapView(frame: .zero, mapInitOptions: options)
        
        // Set up the gesture delegate
        mapView.gestures.delegate = context.coordinator
        
        // Set up the location manager
        mapView.location.options = LocationOptions(
            puckType: .puck2D(),
            puckBearingEnabled: true
        )
        
        // Add a tap gesture recognizer
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleMapTap(_:)))
        mapView.addGestureRecognizer(tapGesture)
        
        return mapView
    }
    
    func updateUIView(_ mapView: MapboxMaps.MapView, context: Context) {
        // Update the camera position when the center coordinate changes
        mapView.mapboxMap.setCamera(to: CameraOptions(
            center: centerCoordinate,
            zoom: mapViewModel.zoomLevel
        ))
        
        // Show or hide the user location puck
        mapView.location.options.puckType = mapViewModel.isShowingUserLocation ? .puck2D() : nil
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, GestureManagerDelegate {
        var parent: MapView
        
        init(_ parent: MapView) {
            self.parent = parent
        }
        
        @objc func handleMapTap(_ gesture: UITapGestureRecognizer) {
            let mapView = gesture.view as! MapboxMaps.MapView
            let point = gesture.location(in: mapView)
            let coordinate = mapView.mapboxMap.coordinate(for: point)
            parent.onMapTap?(coordinate)
        }
    }
}

struct MapViewPreview: View {
    @StateObject private var mapViewModel = MapViewModel()
    @State private var centerCoordinate = CLLocationCoordinate2D(latitude: -42.0, longitude: 147.0)
    
    var body: some View {
        MapView(
            centerCoordinate: $centerCoordinate,
            mapViewModel: mapViewModel,
            onMapTap: { coordinate in
                print("Tapped at: \(coordinate.latitude), \(coordinate.longitude)")
            }
        )
    }
}

#Preview {
    MapViewPreview()
}
