const express = require('express');
const overviewController = require('../controller/overview.controller')

const overviewRouter = express.Router();

overviewRouter.get('/', overviewController.simpleOverviews);

module.exports = overviewRouter;