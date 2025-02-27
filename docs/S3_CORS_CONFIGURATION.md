# S3 CORS Configuration for Direct Uploads

To enable direct uploads from the browser to S3, you need to configure CORS (Cross-Origin Resource Sharing) on your S3 bucket. This document explains how to do that.

## Why CORS Configuration is Needed

When your web application tries to upload files directly to S3 from the browser, the browser will send a preflight request to check if the S3 bucket allows requests from your domain. Without proper CORS configuration, these requests will be blocked by the browser.

## Configuration Steps

### Option 1: Using the AWS Management Console

1. Sign in to the AWS Management Console and open the S3 console at https://console.aws.amazon.com/s3/
2. In the Buckets list, choose the name of the bucket that you want to configure
3. Choose **Permissions**
4. In the **Cross-origin resource sharing (CORS)** section, choose **Edit**
5. In the CORS configuration editor, paste the following JSON:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "DELETE"],
    "AllowedOrigins": [
      "https://your-production-domain.com", 
      "https://your-staging-domain.vercel.app", 
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag", "x-amz-meta-*"]
  }
]
```

6. Replace `https://your-production-domain.com` and `https://your-staging-domain.vercel.app` with your actual domains
7. Choose **Save changes**

### Option 2: Using the AWS CLI

1. Create a file named `cors-config.json` with the following content:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET", "DELETE"],
    "AllowedOrigins": [
      "https://your-production-domain.com", 
      "https://your-staging-domain.vercel.app", 
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag", "x-amz-meta-*"]
  }
]
```

2. Replace `https://your-production-domain.com` and `https://your-staging-domain.vercel.app` with your actual domains
3. Run the following AWS CLI command:

```bash
aws s3api put-bucket-cors --bucket your-bucket-name --cors-configuration file://cors-config.json
```

4. Replace `your-bucket-name` with your actual S3 bucket name

## Verifying the Configuration

To verify that your CORS configuration is working correctly:

1. Open your web application in the browser
2. Try uploading a file using the direct upload feature
3. Open the browser's developer tools (F12) and check the Network tab
4. Look for the preflight request (OPTIONS) to your S3 bucket
5. Verify that the response includes the appropriate CORS headers

## Troubleshooting

If you're still experiencing CORS issues:

1. Check that your domains in the AllowedOrigins list exactly match the origin of your web application
2. Ensure that the HTTP/HTTPS protocol matches
3. Verify that the S3 bucket name in your application code matches the bucket you configured
4. Check that your AWS credentials have permission to upload to the bucket
5. Look for any errors in the browser console or network tab

## Security Considerations

- Only include domains that you control in the AllowedOrigins list
- Consider restricting AllowedHeaders and AllowedMethods to only what you need
- Set appropriate bucket policies and IAM permissions to control who can upload files
- Consider setting up a CloudFront distribution in front of your S3 bucket for additional security
