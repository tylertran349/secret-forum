const mongoose = require("mongoose");
const Schema = mongoose.Scehma;

const MessageSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    title: {type: String, required: true},
    content: {type: String, required: true},
    time: {type: Date, required: true}
});

module.exports = mongoose.model("Message", MessageSchema);