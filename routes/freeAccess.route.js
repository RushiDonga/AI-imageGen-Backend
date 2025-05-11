const express = require('express');
const freeAccessController = require('../controller/freeUser.controller');
const aiController = require('../controller/ai.controller')

const freeAccessRouter = express.Router();

// Create a new User
freeAccessRouter.post('/access', freeAccessController.grantAccess, aiController.textToImage, aiController.updateUserCredits);

freeAccessRouter.post('/getCredits', freeAccessController.getCredits);
module.exports = freeAccessRouter;