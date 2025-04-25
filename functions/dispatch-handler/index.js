const AWS = require('aws-sdk');
const log = require('npmlog');

const Batch = new AWS.Batch();
// Initialize AWS services
const s3 = new AWS.S3();

exports.handler = async (event) => {
  log.info('Execution', `Beginning dispatch_batch_job execution. ${JSON.stringify(event)}`);

  // Get the S3 path(s) -- multiple possible records can come in one invocation
  const jobPaths = [];


    for(const record of event.Records )
    {
      const key = record.s3.object.key.replace(/\/dispatch$/, '');
      const bucket = record.s3.bucket.name;

      const params = {
        Bucket: bucket,
        Key: record.s3.object.key
      };
      
      const data = await s3.getObject(params).promise();
      const content = data.Body.toString('utf-8');
      const eMail = content.split('\n')[0];

      jobPaths.push({
        name: record.s3.bucket.name,
        key,
        email:eMail,
      });

    }


  // Create an AWS batch job to process each path
  await Promise.all(jobPaths.map(async (path) => {
    log.info('Execution', `Sending batch job for ${JSON.stringify(path)}`);

    const params = {
      jobDefinition: process.env.JOB_DEFINITION,
      jobName: `DroneWrangler-${path.key}`,
      jobQueue: process.env.JOB_QUEUE,
      parameters: {
        bucket: path.name,
        key: path.key,
        email: path.email
      },
      retryStrategy: {
        attempts: 1,
      },
    };

    log.info('Execution', `Launching with params: ${JSON.stringify(params)}`);
    try {
      //Send Images out for processing
      const results = await Batch.submitJob(params).promise();
      log.info('Execution', JSON.stringify(results)); // successful response)
    } catch (err) {
      log.error('Execution', err.message);
    }
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `Beginning the dispatch of a batch job at ${event}.`,
  };
};
