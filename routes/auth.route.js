const express = require('express');
const authController = require('../controller/auth.controller');

const userRouter = express.Router();

// Create a new User
userRouter.post('/signup', authController.signup);

userRouter.post('/signin', authController.signin);

userRouter.post('/update-password', authController.updatePassword);

userRouter.post('/forgot-password', authController.forgotPassword);

userRouter.patch('/reset-password/:resetToken', authController.resetPassword)

module.exports = userRouter;