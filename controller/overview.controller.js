exports.simpleOverviews = (req, res, next) => {

    console.log("Route was hit in Controller");

    res.status(200).json({
        status: 'success',
        overview: 'A simple Text to Image Application, which will help me get a JOB'
    })
}