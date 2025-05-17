// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBXExperimentalWssBackendDataType)
{
    MBXExperimentalWssBackendDataTypeNSData,
    MBXExperimentalWssBackendDataTypeNSString
} NS_SWIFT_NAME(DataType);

NS_SWIFT_NAME(Data)
__attribute__((visibility ("default")))
@interface MBXExperimentalWssBackendData : NSObject

// This class provides factory method which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides factory method which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

+ (nonnull instancetype)fromNSData:(nonnull NSData *)value;
+ (nonnull instancetype)fromNSString:(nonnull NSString *)value;

- (BOOL)isNSData;
- (BOOL)isNSString;

- (nonnull NSData *)getNSData __attribute((ns_returns_retained));
- (nonnull NSString *)getNSString __attribute((ns_returns_retained));

@property (nonatomic, readonly) MBXExperimentalWssBackendDataType type;

@end
