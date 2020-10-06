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
  {
    scheduleTime: 60000 + Date.now(), // Delayed in 60 seconds
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
const cloudTasksConfig = {
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
    maxRetryDuration: number, // in seconds
    minBackoff: number, // in seconds
    maxBackoff: number, // in seconds
    maxDoublings: number,
  };
};
```

## Notice

> The queue will be created and configured in the first run. To change the configuration after the queue
  was created, you have to delete the queue manually and run some task again.
