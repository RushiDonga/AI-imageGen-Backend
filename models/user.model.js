const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
    },
    email: {
        type: String,
        required: [true, 'An email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    role: {
        type: String,
        enum: ['user', 'super-user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        minlength: [8, 'A password should have a min length of 8'],
        select: false
    },
    confirmPassword: {
        type: String,
        validate: {
            validator: function(value){
                return value === this.password;
            },
            message: 'Passwords do not match!'
        },
        select: false
    },
    active: {
        type: Boolean,
        default: true
    },
    refreshToken: {
        type: Array,
        select: false
    },
    created_using: {
        type: String,
        enum: ['email', 'google']
    },
    credits: {
      type: Number,
      require: true
    },
    created_at: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpiresIn: String
});

// Encrypt the password before saving it to database
UserSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next();

    this.credits = 5;
    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;
    next();
})

// Check if the password is correct while signing in
UserSchema.methods.checkPassword = async function(candidatePassword, userPassword){
    return await bcrypt.compare(candidatePassword, userPassword);
};

// Generate a Password Reset Token
UserSchema.methods.generatePasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    console.log(resetToken, this.passwordResetToken);

    this.passwordResetExpiresIn = Date.now() + 10 * 60 * 1000

    return resetToken;
}

UserSchema.methods.changedPasswordAt = function(jwtTimeStamp){

    if(this.passwordChangedAt){
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return jwtTimeStamp < changedTimestamp;
    }
    return false;
}

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;