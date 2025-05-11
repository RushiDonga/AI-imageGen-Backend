const axios = require('axios');
const AppError = require('./appError');

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `${process.env.STABLE_DIFFUSION_API_key}`,
    'Accept': 'application/json'
}

exports.textToImageAPI = async (payload, next) => {
    try{
        const response = await axios.post('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', payload, {headers});
        return response.data.artifacts;
    }catch(error){
        console.log(error);
        return next(new AppError(`Error in generating Image: ${error.message}`, 500));
    }   
}
