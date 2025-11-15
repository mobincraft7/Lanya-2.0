const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://USERNAME:PASSWORD@cluster0.xxx.mongodb.net/DATABASE", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Mongo Connected"))
.catch(err => console.log(err));
