import { Hono } from 'hono';

import settings from './settings';
import user from './user';
import bind_address from './bind_address';
import passkey from './passkey';
import oauth2 from './oauth2';
import user_mail_api from './user_mail_api';

export const api = new Hono<HonoCustomType>();

// settings api
api.get('/api/user/open_settings', settings.openSettings);
api.get('/api/user/settings', settings.settings);

// mail api
api.get('/api/user/mails', user_mail_api.getMails);
api.delete('/api/user/mails/:id', user_mail_api.deleteMail);

// user api
api.post('/api/user/login', user.login);
api.post('/api/user/verify_code', user.verifyCode);
api.post('/api/user/register', user.register);

// oauth2 api
api.get('/api/user/oauth2/login_url', oauth2.getOauth2LoginUrl);
api.post('/api/user/oauth2/callback', oauth2.oauth2Login);

// bind address api
api.get('/api/user/bind_address', bind_address.getBindedAddresses);
api.post('/api/user/bind_address', bind_address.bind);
api.get('/api/user/bind_address_jwt/:address_id', bind_address.getBindedAddressJwt);
api.post('/api/user/unbind_address', bind_address.unbind);
api.post('/api/user/transfer_address', bind_address.transferAddress);

// passkey api
api.get('/api/user/passkey', passkey.getPassKeys);
api.post('/api/user/passkey/rename', passkey.renamePassKey);
api.delete('/api/user/passkey/:passkey_id', passkey.deletePassKey);
api.post('/api/user/passkey/register_request', passkey.registerRequest);
api.post('/api/user/passkey/register_response', passkey.registerResponse);
api.post('/api/user/passkey/authenticate_request', passkey.authenticateRequest);
api.post('/api/user/passkey/authenticate_response', passkey.authenticateResponse);
