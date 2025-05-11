const express = require('express');
const serverless = require('serverless-http'); // ✅ Required for Vercel

const overviewRouter = require('../routes/overview.route');
const authRouter = require('../routes/auth.route');
const aiRouter = require('../routes/ai.route');
const freeUserRouter = require('../routes/freeAccess.route');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const { globalErrorHandler } = require('../middleware/globalErrorHandler');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const app = express();

console.log("In express app");

// Connect DB only once
let connected = false;
async function connectToDB() {
  if (!connected) {
    await mongoose.connect(
      `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@promptpaint.af4fl0x.mongodb.net/?retryWrites=true&w=majority&appName=PromptPaint`
    );
    connected = true;
    console.log("DB connected");
  }
}
connectToDB();

// Middleware
app.use(express.json({ limit: '30kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(cookieParser());
app.use(xss());
app.use(cors({
  origin: 'https://persception.netlify.app',
  credentials: true,
}));

// Routes
console.log("API Route was hit at root")
app.use('/', overviewRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/ai/', aiRouter);
app.use('/api/v1/free/', freeUserRouter);

// Error Handling
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on the server`, 404));
});
app.use(globalErrorHandler);

// ✅ Export as handler
module.exports = serverless(app);
