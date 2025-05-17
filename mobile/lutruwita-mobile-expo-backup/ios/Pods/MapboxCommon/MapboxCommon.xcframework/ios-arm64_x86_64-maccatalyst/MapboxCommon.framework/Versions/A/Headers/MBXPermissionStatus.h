// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** Location permissions granted by user to the app. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBXPermissionStatus)
{
    /** Access to location is not allowed. */
    MBXPermissionStatusDenied,
    /**
     * Access to location is allowed.
     *
     * This type of permission is defined for platforms that do not have foreground/background access granularity.
     * If you use Android version 28 or older and need a background location access it can be configured with
     * `com.mapbox.common.location.sdk28_use_background_permissions` setting.
     * To set `com.mapbox.common.location.sdk28_use_background_permissions` add an mapbox-location-config.xml file with
     * the following content:
     *
     * <resources>
     * <bool name="com.mapbox.common.location.sdk28_use_background_permissions">true</bool>
     * </resources>
     */
    MBXPermissionStatusGranted,
    /** Access to location is allowed only while an app is in use. */
    MBXPermissionStatusForeground,
    /** Access to location is allowed all the time. */
    MBXPermissionStatusBackground
} NS_SWIFT_NAME(PermissionStatus);

NSString* MBXPermissionStatusToString(MBXPermissionStatus permission_status);
