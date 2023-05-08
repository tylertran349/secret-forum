const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { DateTime } = require("luxon");

const PostSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    title: {type: String, required: true},
    content: {type: String, required: true},
    time: {type: Date, required: true}
});

PostSchema.virtual("time_formatted").get(function() {
    return DateTime.fromJSDate(this.time, { zone: "system" }).toLocaleString(DateTime.DATETIME_SHORT, { zone: "system" }); // Format time like this: 5/07/2015, 6:31 AM and set time zone to local computer's time zone
});

module.exports = mongoose.model("Post", PostSchema);