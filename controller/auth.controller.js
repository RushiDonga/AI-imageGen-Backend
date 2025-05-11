const UserModel = require("../models/user.model");
const AppError = require("../utils/appError");
const { catchAsync } = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const util = require("util");

const signAccessToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
  });
};

const signRefreshToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
  });
};

const setRefreshTokenCookies = (res, refreshToken) => {
  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: false, // true for Production
    sameSite: "Lax", // None for production
    maxAge: 24 * 60 * 60 * 1000,
  });
};

// Response to the user when the user is created
const sendResponseWhileSignUp = async (user, res) => {
  // 4. Get the tokens
  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  // 5. Add RefreshToken to the DB
  user.refreshToken = [refreshToken];
  await user.save({ validateBeforeSave: false });

  // 6. Set Cookies
  setRefreshTokenCookies(res, refreshToken);

  // 7. Send Response
  const userData = user.toObject();
  delete userData.password;
  delete userData.refreshToken;

  res.status(200).json({
    accessToken,
    data: {
      user,
    },
  });
};

// User creates a new account
exports.signup = catchAsync(async (req, res, next) => {
  // 1. Check if all fields are present
  if (req.body.created_using === "email") {
    if (
      !req.body.name ||
      !req.body.email ||
      !req.body.password ||
      !req.body.confirmPassword
    ) {
      return next(
        new AppError("name, email, password, confirmPassword is required", 401)
      );
    }
  } else if (req.body.created_using === "google") {
    if (!req.body.name || !req.body.email) {
      return next(new AppError("name and email is required", 401));
    }
  } else {
    return next(new AppError("A HACKER is trying to access the system", 401));
  }

  // 2. Check for duplicate user
  const user = await UserModel.findOne({ email: req.body.email });
  if (user) {
    if (
      user.created_using === "google" &&
      req.body.created_using === "google"
    ) {
      return sendResponseWhileSignUp(user, res);
    } else {
      return next(
        new AppError(`User with email: ${req.body.email} already exists`, 401)
      );
    }
  }

  let data;
  // 3. Create new user in DB
  if (req.body.created_using === "email") {
    data = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      created_using: "email",
      created_at: Date.now(),
      credits: 2,
      role: 'user'
    };

    if (req.body.role) data.role = req.body.role;
  } else if (req.body.created_using === "google") {
    data = {
      name: req.body.name,
      email: req.body.email,
      created_using: "google",
      created_at: Date.now(),
      credits: 2
    };

    if (req.body.role) data.role = req.body.role;
  }

  const newUser = await UserModel.create(data);

  if (!newUser) {
    return next(new AppError("Error creating user!", 500));
  }

  return sendResponseWhileSignUp(newUser, res);
});

// User tries to Login into the existing account
exports.signin = catchAsync(async (req, res, next) => {
  // 1. Check if the Refresh token exists in the cookie
  const cookies = req.cookies;

  // 2. Check if the user login details are present in the req body
  let email = req.body.email;
  let signIn_type = req.body.signIn_type
  if (!email && !signIn_type) return next(new AppError("Please provide a valid email and signIn_type", 400));

  // 3. Fetch the data of the user
  const user = await UserModel.findOne({ email: email })
    .select("+password")
    .select("+refreshToken");

  if (!user)
    return next(new AppError(`User not found with given ${email}`, 400));

  if (user.created_using === "email" && signIn_type === "email") {
    let password = req.body.password;
    if (!password)
      return next(new AppError("Please provide a valid password", 400));

    // 4. Check if the password matches the user's password
    if (!(await user.checkPassword(password, user.password))) {
      return next(new AppError("Incorrect password", 401));
    }
  }else if(user.created_using === "google" && signIn_type !== "google"){
    return next(new AppError('Please authenticate via Google.', 401));
  }

  // 5. Generate a new Access Token and Refresh Token
  let accessToken = signAccessToken(user.id);
  let refreshToken = signRefreshToken(user.id);

  // 6. Handle Refresh Token reuse detection
  let refreshTokenArray = user.refreshToken || [];
  if (cookies.jwt) {
    const tokenFromCookie = cookies.jwt;

    const foundToken = await UserModel.findOne({
      refreshToken: tokenFromCookie,
    });

    if (!foundToken) {
      // TOKEN IS IN DANGER 💀 because the token was not found in DB
      refreshTokenArray = [];
    } else if (foundToken.id !== user.id) {
      // TOKEN IS IN DANGER 💀 because the token was assigned to another user
      foundToken.refreshToken = [];
      await foundToken.save();

      refreshTokenArray = [];
    } else {
      // Token is SAFE
      refreshTokenArray = refreshTokenArray.filter(
        (rt) => rt !== tokenFromCookie
      );
    }
  }

  // 7. Clear old refresh token cookie
  res.clearCookie("jwt", { httpOnly: true, secure: false, sameSite: "Lax" });

  // 8. Update the user's refresh token list in the DB
  user.refreshToken = [...refreshTokenArray, refreshToken];
  await user.save();

  // 9. Set new refresh token in a secure HTTP-only cookie
  setRefreshTokenCookies(res, refreshToken);

  // 10. Send access token and data to the user
  const userData = user.toObject();
  delete userData.password;
  delete userData.refreshToken;

  res.status(200).json({
    accessToken,
    data: {
      user: userData,
    },
  });
});

// User forgot the Password
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1). Extract the email from the request body
  let email = req.body.email;

  // 2). Check if the email exists
  const user = await UserModel.findOne({ email: email });
  if (!user) {
    return next(new AppError(`No user exists with email: ${email}`, 400));
  }

  // 3). Generate a password reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 4). Send it to the user
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/reset-password/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email.`;

  res.status(200).json({
    status: "success",
    resetURL: resetURL,
    message: message,
  });
});

// Reset the user Password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1). Get the token passed in the URL
  const resetToken = req.params.resetToken;
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 2). If the password has not been expires, and there exists a user, update the password
  const user = await UserModel.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresIn: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  // 3). Update the user Password
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresIn = undefined;
  await user.save();

  // 4). Log the user in and send JWT Token
  res.status(200).json({
    status: "success",
  });
});

// When the user did not forgot the Password and want to update it
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1). Check if email and password exists
  if (!req.body.email || !req.body.password || !req.body.newPassword) {
    return next(
      new AppError("Email, OldPassword and NewPassword are required", 400)
    );
  }

  // 2). Check if the given password is correct
  const user = await UserModel.findOne({ email: req.body.email }).select(
    "+password"
  );
  if (!user.checkPassword(req.body.password, user.password)) {
    return next(new AppError("Incorrect Password", 400));
  }

  // 3). Update the password
  user.password = req.body.newPassword;
  user.confirmPassword = user.password;

  // 4). Save to database
  await user.save();
  console.log(user);

  // 5). Send response to the user
  createSendToken(user, 200, res);
});

// Checks if the user is authorized to perform actions
exports.protect = catchAsync(async (req, res, next) => {
  // 1). Check if the access token exists
  let jwtToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    jwtToken = req.headers.authorization.split(" ")[1];
  }

  if (!jwtToken) {
    return next(
      new AppError("You are not logged In. Please login to access", 401)
    );
  }

  // 2). Decode and verify the Access Token
  try {
    const decoded = jwt.verify(jwtToken, process.env.JWT_ACCESS_TOKEN_SECRET);
    console.log(decoded);

    // 3). Check if the user exists
    const user = await UserModel.findById(decoded.id);
    if (!user) {
      return next(
        new AppError("The user belonging to the token no longer exists", 401)
      );
    }

    // 4). Check if the user changed password after the token was issued
    if (user.changedPasswordAt(decoded.iat)) {
      return next(
        new AppError("User changed password recently, Please login again!", 401)
      );
    }

    // 5). GRANT ACCESS TO THE PROTECTED ROUTE
    req.accessToken = jwtToken;
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      //3. Extract the Access Token
      const decoded = jwt.decode(jwtToken);
      if (!decoded || !decoded.id) {
        return next(new AppError("Invalid token payload", 401));
      }

      //4. Check if the user with given ID exists
      const user = await UserModel.findById(decoded.id).select("+refreshToken");
      if (!user) {
        return next(new AppError("User no longer exists", 401));
      }

      //5. Check if the user changed password after the token was issued
      if (user.changedPasswordAt(decoded.iat)) {
        return next(
          new AppError(
            "User changed password recently, Please login again!",
            401
          )
        );
      }

      //6. Check if the refresh token exists
      const refreshToken = req.cookies.jwt;
      if (!refreshToken || !user.refreshToken.includes(refreshToken)) {
        return next(new AppError("Invalid or missing refresh token", 401));
      }

      //7. Check if the refresh token is not expired
      try {
        const decodedRef = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_TOKEN_SECRET
        );
      } catch (error) {
        return next(new AppError("Refresh token expired. Please login again", 401));
      }

      accessToken = signAccessToken(decoded.id);
      req.accessToken = accessToken;
      req.user = user;
      next();
    } else {
      return next(
        new AppError("Invalid Access Token, Please login again", 401)
      );
    }
  }
});

// Role based Restrictions
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles: user, super-user, admin
    if (!roles.includes(req.user.role)) {
      return next(new AppError("Unauthorized Route", 403));
    }

    next();
  };
};
