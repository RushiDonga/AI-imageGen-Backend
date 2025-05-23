const express = require('express');
const overviewRouter = require('./routes/overview.route');
const authRouter = require('./routes/auth.route')
const aiRouter = require('./routes/ai.route')
const freeUserRouter = require('./routes/freeAccess.route')
const mongoose = require('mongoose');
const AppError = require('./utils/appError');
const {globalErrorHandler} = require('./middleware/globalErrorHandler');
const cookieParser = require('cookie-parser');
const cors = require('cors')
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const groupHugRouter = require('./routes/grouphug.route');

const app = express();

// CORS
const allowedOrigins = ['https://persception.netlify.app', 'https://organizechats.netlify.app', 'http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Variables
const PORT = process.env.PORT;
const USERNAME = process.env.DB_USERNAME;
const PASSWORD = process.env.DB_PASSWORD;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10kb' })); 
app.use(express.json({limit: '30kb'}));
app.use(mongoSanitize());
app.use(cookieParser());
app.use(xss());

// Routes
app.use('/', overviewRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/ai/', aiRouter);
app.use('/api/v1/free/', freeUserRouter);
app.use('/api/v1/groupHug/', groupHugRouter);

// Connect to Database
mongoose.connect(`mongodb+srv://${USERNAME}:${PASSWORD}@promptpaint.af4fl0x.mongodb.net/?retryWrites=true&w=majority&appName=PromptPaint`)
.then(() => {
  console.log("Database connection: Successful");
}).catch((error) => {
  console.log("Database Connection: Unsuccessful ");
  console.log(error)
})

// Start App
const server = app.listen(PORT, () => {
  console.log(`App running on PORT: ${PORT}`)
});

// Error Handling
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on the server`, 404));
});

app.use(globalErrorHandler);