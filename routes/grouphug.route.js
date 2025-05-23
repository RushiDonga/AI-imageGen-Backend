const express = require('express');
const grouphugController = require('../controller/grouphug.controller');

const groupHugRouter = express.Router();

groupHugRouter.post('/organize', grouphugController.organizeData);
module.exports = groupHugRouter;