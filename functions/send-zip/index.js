const AWS = require('aws-sdk');
const log = require('npmlog');

const Batch = new AWS.Batch();
const s3 = new AWS.S3();
const ses = new AWS.SES({ region: 'us-west-2' });
exports.handler = async (event) => {
  log.info('Execution', `Beginning dispatch_batch_job execution. ${JSON.stringify(event)}`);

  // Get the S3 path(s) -- multiple possible records can come in one invocation
  const jobPaths = [];

  for (const record of event.Records) {

    const bucket = record.s3.bucket.name;
      
    // Get the S3 key for the zip file
    const zipKey = record.s3.object.key;
    
    // Get the base path (without the odmoutput.zip suffix)
    const basePath = zipKey.replace(/\/odmoutput\.zip$/, '');
    
    // Construct the path to the dispatch file that contains the email
    const dispatchKey = `${basePath}/dispatch`;
    
    log.info('Processing', `Found zip file at ${bucket}/${zipKey}`);
    
    // Get the email from the dispatch file
    let email;
    try {
      // Get the dispatch file content
      const dispatchData = await s3.getObject({
        Bucket: bucket,
        Key: dispatchKey
      }).promise();
      
      // Extract email from first line
      email = dispatchData.Body.toString('utf-8').split('\n')[0].trim();
      log.info('Email', `Found email: ${email}`);
    } catch (err) {
      log.error('Error', `Could not read dispatch file: ${err.message}`);
      email = 'bshafer93@gmail.com'; // Fallback email if dispatch file can't be read
    }
    
    // Generate a pre-signed URL that expires in 2 days (172800 seconds)
    const downloadUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: zipKey,
      ResponseContentDisposition: 'attachment;',
      Expires: 172800
    });

          // Send email with the download link
          const emailParams = {
            Source: 'info@aeroai.io',
            Destination: {
                ToAddresses: [email]
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



  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `Beginning the dispatch of a batch job at ${event}.`,
  };
};
