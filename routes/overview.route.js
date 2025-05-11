const express = require('express');
const overviewController = require('../controller/overview.controller')

const overviewRouter = express.Router();

console.log("Route was hit in Router");

overviewRouter.get('/', overviewController.simpleOverviews);

module.exports = overviewRouter;