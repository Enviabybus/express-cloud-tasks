/* eslint-disable no-console */
import { OAuth2Client } from 'google-auth-library';
import bodyParser from 'body-parser';
import express, { Router } from 'express';

import { CloudTasksConfig, validateConfig } from './config';
import { CloudTasksPayload, queuesHandlers } from './queue';

export const Api = (
  {
    config,
  }: {
    config: CloudTasksConfig;
  },
  loader?: (queueName: string, handlerId: string, args: any[]) => Promise<void>,
): Router => {
  validateConfig(config);
  const router = express.Router();
  const { handlerPath, serviceUrl } = config;

  const authenticate = async (token: string): Promise<void> => {
    const authClient = new OAuth2Client();

    await authClient.verifyIdToken({
      idToken: token,
      audience: new URL(handlerPath, serviceUrl).href,
    });
  };

  router.post(handlerPath, bodyParser.raw({ type: 'application/octet-stream' }), async (req, res) => {
    try {
      if (!req.body) {
        const msg = 'no payload received';
        console.error(`error: ${msg}`);
        res.status(400).send(`Bad Request: ${msg}`);
        return;
      }
      const payload: CloudTasksPayload = JSON.parse(req.body);
      if (!payload.handlerId) {
        const msg = 'invalid Express Cloud Tasks payload format';
        console.error(`error: ${msg}`);
        res.status(400).send(`Bad Request: ${msg}`);
        return;
      }
      if (config.serviceAccount) {
        const bearer = req.header('Authorization');
        if (!bearer) {
          const msg = 'Unauthenticated request';
          console.error(`error: ${msg}`);
          res.status(401).send(`Unauthorized: ${msg}`);
          return;
        }
        const token = bearer.replace(/Bearer\s/i, '');
        try {
          await authenticate(token);
        } catch (e) {
          res.status(400).send('Invalid token');
          return;
        }
      }

      const queueName = req.headers['x-cloudtasks-queuename'] as string;
      const { handlerId, args = [] } = payload;

      if (loader) {
        await loader(queueName, handlerId, args);
      } else {
        const handlers = queuesHandlers[queueName] || {};
        const handler = handlers[handlerId];

        if (!handler) {
          console.error(`error: handler '${handlerId}' for queue '${queueName}' not registered`);
          res.sendStatus(204);
          return;
        }

        await handler(...args);
      }

      res.sendStatus(204);
    } catch (e) {
      console.error(e);
      res.status(500).send(`Internal Server Error: ${e.message}`);
    }
  });

  return router;
};
