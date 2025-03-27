const AWS = require('aws-sdk');
const archiver = require('archiver');
const stream = require('stream');

// Initialize AWS services
const s3 = new AWS.S3();
const ses = new AWS.SES({ region: 'us-west-2' });

exports.handler = async (event) => {
    try {
        // Configuration - replace with your values
        const sourceBucket = 'user-drone-data-dev';
        const targetBucket = 'user-drone-data-dev/brentshaferImagePipelineFullTest01';
        const folderPaths = ['brentshaferImagePipelineFullTest01/output/']; // Folders to zip
        const zipFileName = `output-${Date.now()}.zip`;
        const recipientEmail = 'bshafer93@gmail.com'; // This could be passed in the event
        
        // Create a pass-through stream for the zip file
        const passthrough = new stream.PassThrough();
        
        // Create zip archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        
        // Set up the S3 upload parameters
        const uploadParams = {
            Bucket: targetBucket,
            Key: zipFileName,
            Body: passthrough,
            ContentType: 'application/zip'
        };
        
        // Start the S3 upload
        const uploadPromise = s3.upload(uploadParams).promise();
        
        // Pipe archive data to the passthrough stream
        archive.pipe(passthrough);
        
        // Process each folder
        for (const folderPath of folderPaths) {
            // List all objects in the folder
            const listParams = {
                Bucket: sourceBucket,
                Prefix: folderPath
            };
            
            const listedObjects = await s3.listObjectsV2(listParams).promise();
            
            // Add each file to the archive
            for (const object of listedObjects.Contents) {
                if (object.Key !== folderPath) { // Skip folder itself
                    const fileData = await s3.getObject({
                        Bucket: sourceBucket,
                        Key: object.Key
                    }).promise();
                    
                    archive.append(fileData.Body, { name: object.Key });
                }
            }
        }
        
        // Finalize the archive
        await archive.finalize();
        
        // Wait for the upload to complete
        await uploadPromise;

        // Generate a pre-signed URL that expires in 7 days (604800 seconds)
        const downloadUrl = s3.getSignedUrl('getObject', {
          Bucket: targetBucket,
          Key: zipFileName,
          ResponseContentDisposition: 'attachment;',
          Expires: 604800
      });
      
      // Send email with the download link
      const emailParams = {
          Source: 'info@aeroai.io',
          Destination: {
              ToAddresses: [recipientEmail]
          },
          Message: {
              Subject: {
                  Data: 'Your files are ready for download'
              },
              Body: {
                  Text: {
                      Data: `Hello,\n\nYour requested files have been packaged. You can download them using this link:\n${downloadUrl}\n\nThis link will expire in 7 days.\n\nThank you!`
                  }
              }
          }
      };
      
      await ses.sendEmail(emailParams).promise();
      

        return {
            statusCode: 200,
            body: 'Files successfully zipped and email sent'
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: `Error processing request: ${error.message}`
        };
    }
};