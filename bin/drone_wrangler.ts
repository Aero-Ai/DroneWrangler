#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DroneWranglerStack } from '../lib/drone_wrangler_stack';

const app = new cdk.App();
new DroneWranglerStack(app, 'DroneWranglerStack', {
});