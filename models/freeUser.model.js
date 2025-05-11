const mongoose = require('mongoose');

const freeAccessSchema = new mongoose.Schema({
    deviceId:{
        required: [true, "deviceId is required"],
        type: String
    },
    credits: {
        required: true,
        type: Number
    }
});

const FreeAccessModel = mongoose.model('FreeAccess', freeAccessSchema);
module.exports = FreeAccessModel;