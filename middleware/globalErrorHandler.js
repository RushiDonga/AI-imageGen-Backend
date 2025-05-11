const handleErrorDev = (err, res) => {

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        err: err,
        stack: err.stack
    })
}


const handleErrorProd = (err, res) => {
    if(err.isOperational){
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    }else{
        // 1). Log the error
        console.log('ERROR: ', err);

        // 2). Send generic message
        res.status(err.statusCode).json({
            status: 'error',
            message: 'something wend very wrong!'
        })
    }
}

exports.globalErrorHandler = (err, req, res, next) => {
    console.log(process.env.ENVIRONMENT)

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error'

    if(process.env.ENVIRONMENT == 'development'){
        handleErrorDev(err,  res);
    }else if(process.env.ENVIRONMENT == 'production'){
        handleErrorProd(err, res);
    }
}