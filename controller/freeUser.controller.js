const AppError = require("../utils/appError");
const { catchAsync } = require("../utils/catchAsync");
const FreeAccessModel = require("../models/freeUser.model");

exports.grantAccess = catchAsync(async (req, res, next) => {
  if (req.body.deviceId) {
    const response = await FreeAccessModel.findOne({
      deviceId: req.body.deviceId,
    });

    if (response) {
      if (response.credits > 0) {
        req.freeUser = response;
        next();
      } else {
        return next(
          new AppError("Credits unavailable, Please purchase some credits", 401)
        );
      }
    } else {
      const createDevice = await FreeAccessModel.create({
        deviceId: req.body.deviceId,
        credits: 2,
      });

      if (createDevice) {
        req.freeUser = createDevice;
        next();
      }
    }
  } else {
    return next(new AppError("deviceId is required", 401));
  }
});

exports.getCredits = catchAsync(async (req, res, next) => {
    if(req.deviceId){
        const response = await FreeAccessModel.findOne({deviceId: req.deviceId});

        if(response){
            res.status(200).json({
                credits: response.credits
            })
        }else{
            res.status(200).json({
                credits: 2
            })
        }
    }

    return next(new AppError('Device Id is required', 401));
})
