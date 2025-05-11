const AppError = require("../utils/appError");
const { catchAsync } = require("../utils/catchAsync");
const aiAPI = require("../utils/apiCalls");

exports.updateUserCredits = catchAsync(async (req, res, next) => {
  if (req.freeUser) {
    req.freeUser.credits = req.freeUser.credits - 1;
    await req.freeUser.save();
  } else if (req.user) {
    req.user.credits = req.user.credits - 1;
    await req.user.save();
  }

  res.status(200).json(req.sendResponse);
});

exports.checkCredits = catchAsync(async (req, res, next) => {
  if (req.user.credits > 0) {
    next();
  } else {
    return next(
      new AppError("Credits unavailable, Please purchase some credits", 401)
    );
  }
});

exports.textToImage = catchAsync(async (req, res, next) => {
  const payload = {
    cfg_scale: 7,
    height: req.body.height,
    width: req.body.width,
    sampler: "K_DPM_2_ANCESTRAL",
    samples: 1,
    steps: 30,
    text_prompts: [
      {
        text: req.body.text,
        weight: 1,
      },
    ],
  };

  const response = await aiAPI.textToImageAPI(payload, next);

  if(!response){
      return next(new AppError('Error generating Image, Please try again later :(', 500));
  }


  const responseData = {
    status: "success",
    data: {
      data: response, // Comment out this when on Production
    },
  };

  if (req.user) {
    responseData.credits = req.user.credits - 1;
  }

  if (req.freeUser) {
    responseData.credits = req.freeUser.credits - 1;
  }

  req.sendResponse = responseData;
  next();
});
