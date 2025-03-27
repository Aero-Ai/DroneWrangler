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
        const zipFileName = `odmoutput.zip`;
        const recipientEmail = 'bshafer93@gmail.com'; 
        

        // Generate a pre-signed URL that expires in 2 days (172800 seconds)
        const downloadUrl = s3.getSignedUrl('getObject', {
          Bucket: targetBucket,
          Key: zipFileName,
          ResponseContentDisposition: 'attachment;',
          Expires: 172800
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
                      Data: `Hello,\n\nYour requested files have been packaged. You can download them using this link:\n${downloadUrl}\n\nThis link will expire in 2 days.\n\nThank you!`
                  }
              }
          }
      };
      
      await ses.sendEmail(emailParams).promise();
      

        return {
            statusCode: 200,
            body: 'File link email sent!'
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: `Error processing request: ${error.message}`
        };
    }
};