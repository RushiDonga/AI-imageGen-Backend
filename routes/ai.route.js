const express = require('express');
const aiController = require('../controller/ai.controller');
const authController = require('../controller/auth.controller')

const aiRouter = express.Router();

aiRouter.post('/text-to-image', authController.protect, authController.restrictTo('user', 'admin'), aiController.checkCredits, aiController.textToImage, aiController.updateUserCredits);

module.exports = aiRouter;