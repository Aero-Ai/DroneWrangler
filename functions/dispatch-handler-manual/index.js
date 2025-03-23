const AWS = require('aws-sdk');
const log = require('npmlog');

const Batch = new AWS.Batch();
const  BUCKET_NAME = "arn:aws:s3:::user-drone-data-dev";

exports.handler = async (event) => {
  log.info('Execution', `Beginning dispatch_batch_job execution. ${JSON.stringify(event)}`);

  // Get the S3 path(s) -- multiple possible records can come in one invocation
  const jobPaths = [];

  // Get query parameters
  const body = JSON.parse(event.body);
  const datasetName = body.datasetname;
  const userName = body.username;


  //UUID if Job Process...
  // Create a sanitized key (object name)
  const key = `${userName}/${datasetName}`;


  jobPaths.push({
    name: "user-drone-data-dev",
    key
  });
  log.info('Execution', `Found new prefix ${"user-drone-data-dev"}, ${key}`);
  log.info('Execution', `Sending batch job for ${JSON.stringify(jobPaths[0])}`);
  const path = jobPaths[0];
  const params = {
    jobDefinition: process.env.JOB_DEFINITION,
    jobName: `DroneWrangler-${userName}`,
    jobQueue: process.env.JOB_QUEUE,
    parameters: {
      bucket: path.name,
      key: path.key,
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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/plain' },
    body: `Beginning the dispatch of a batch job at ${event}.`,
  };

};
