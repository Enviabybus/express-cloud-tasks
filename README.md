# Express Cloud Tasks

Express Cloud Tasks intends to facilitate the integration between Google Cloud Tasks
and Express' applications.

## Installation

npm
```
npm install @enviabybus/express-cloud-tasks
```

yarn
```
yarn add @enviabybus/express-cloud-tasks
```

## Usage

```js
const express = require('express');
const { CloudTasks } = require('express-cloud-tasks');

const app = express();

const cloudTasks = CloudTasks({
  handlerPath: '/my-cloud-tasks-handler',
  location: 'us-central1', // The region where your App Engine is configured
  project: 'awesome-project-1234',
  serviceUrl: 'https://awesome-project-uc.a.run.app',
});

const myQueue = cloudTasks.addQueue('my-queue');

myQueue.addHandler('the-handler-id', (message) => {
  console.log(message);
});

myQueue.addTask('the-handler-id', ['this day was crazy']);
myQueue.addTask(
  'the-handler-id',
  ['this will be crazy'],
  { // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues.tasks#Task.FIELDS
    dispatchDeadline: 30000, // milliseconds
    scheduleTime: new Date(60000 + Date.now()), // delayed in 60 seconds
  }
);

app.use(cloudTasks.api);
```

Cloud Tasks will call the handler API and log `this day was crazy` and `this day will be crazy`
after 60 seconds.

### Using Authentication token on the handler API

First you need to configure a service account to invoke your service. After that you just
have to add the service account name on you Cloud Task config:

```js
const cloudTasks = CloudTasks({
  handlerPath: '/my-cloud-tasks-handler',
  location: 'us-central1', // The region where your App Engine is configured
  project: 'awesome-project-1234',
  serviceUrl: 'https://awesome-project-uc.a.run.app',
  serviceAccount: 'my-service-invoker-service-account',
});

app.use(cloudTasks.api);
```

### Configuring Cloud Task queues

```js
const cloudTasks = CloudTasks({
  handlerPath: '/my-cloud-tasks-handler',
  location: 'us-central1', // The region where your App Engine is configured
  project: 'awesome-project-1234',
  serviceUrl: 'https://awesome-project-uc.a.run.app',
  rateLimits: { // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues#RateLimits
    maxDispatchesPerSecond: number,
    maxBurstSize: number,
    maxConcurrentDispatches: number
  },
  retryConfig: { // https://cloud.google.com/tasks/docs/reference/rest/v2beta3/projects.locations.queues#retryconfig
    maxAttempts: number,
    maxRetryDuration: number, // in milliseconds
    minBackoff: number, // in milliseconds
    maxBackoff: number, // in milliseconds
    maxDoublings: number,
  };
});

const myQueue = cloudTasks.addQueue('my-queue'); // Uses CloudTasks queue configuration

const mySecondQueue = cloudTasks.addQueue('my-second-queue', { // overrides CloudTasks queue configuration
  rateLimits: {
    maxDispatchesPerSecond: number,
    maxBurstSize: number,
    maxConcurrentDispatches: number
  },
  retryConfig: {
    maxAttempts: number,
    maxRetryDuration: number, // in milliseconds
    minBackoff: number, // in milliseconds
    maxBackoff: number, // in milliseconds
    maxDoublings: number,
  };
});
```
