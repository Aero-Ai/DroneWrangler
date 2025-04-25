const AWS = require('aws-sdk');


// Initialize AWS services
const s3 = new AWS.S3();
const ses = new AWS.SES({ region: 'us-west-2' });
const Batch = new AWS.Batch();
exports.handler = async (event) => {
    try {
        const recipientEmail = event.detail.parameters.email;
        const jobStatus = event.detail.status;
        
      // Send email with the download link
      const emailParams = {
          Source: 'info@aeroai.io',
          Destination: {
              ToAddresses: [recipientEmail]
          },
          Message: {
              Subject: {
                  Data: 'Image Processing Status Update'
              },
              Body: {
                  Text: {
                      Data: `Hello,\n\nthe status of your processing job has changed to: \n\n${jobStatus}\n\nThank you!`
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