"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudTasksApi = void 0;
/* eslint-disable no-console */
const google_auth_library_1 = require("google-auth-library");
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
exports.CloudTasksApi = (config, loader) => {
    config_1.validateConfig(config);
    const router = express_1.default.Router();
    const { handlerPath, serviceUrl } = config;
    const authenticate = (token) => __awaiter(void 0, void 0, void 0, function* () {
        const authClient = new google_auth_library_1.OAuth2Client();
        yield authClient.verifyIdToken({
            idToken: token,
            audience: new URL(handlerPath, serviceUrl).href,
        });
    });
    router.post(handlerPath, body_parser_1.default.raw({ type: 'application/octet-stream' }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.body) {
                const msg = 'no payload received';
                console.error(`error: ${msg}`);
                res.status(400).send(`Bad Request: ${msg}`);
                return;
            }
            const payload = JSON.parse(req.body);
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
                    yield authenticate(token);
                }
                catch (e) {
                    res.status(400).send('Invalid token');
                    return;
                }
            }
            const queueName = req.headers['x-cloudtasks-queuename'];
            const { handlerId, args = [] } = payload;
            yield loader(queueName, handlerId, args);
            res.sendStatus(204);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error });
        }
    }));
    return router;
};
//# sourceMappingURL=api.js.map