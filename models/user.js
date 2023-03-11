const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    first_name: {type: String, required: true},
    last_name: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true},
    membership_status: {type: Boolean, required: true},
    admin_status: {type: Boolean, required: true},
    messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
});

module.exports = mongoose.model("User", UserSchema);