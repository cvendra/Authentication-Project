//jshint esversion:6

require("dotenv").config();         //this will be used by .env file
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const port = 3000;
const app = express();
const _ = require("lodash");

//packages for session and possport
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const dbName = "userDataBase";
const mongoose = require("mongoose");

//Use the session module in our project, location of the code in this file is important
app.use(session({
  secret: 'This is my secret key',     //this secret we will later put in .env file
  resave: false,
  saveUninitialized: true
}));

//initialize and start using passport
app.use(passport.initialize());

//tell our application to use passport to manage our sessions
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/" + dbName, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useNewUrlParser: true,
  useFindAndModify: false
});

mongoose.set("useCreateIndex", true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log(dbName + " connection successful!");
});

const userSchema = new mongoose.Schema({
  username: {
    type: String
  //  required: [true, "Why no username?"]
  },
  password: {
    type: String
  //  required: [true, "Why no password?"]
  }
});

//tell our userSchema to use passportLocalMongoose as the plugin
//passportLocalMongoose will do hashing and salting of our password and then save the new user to MongoDB
userSchema.plugin(passportLocalMongoose);

const NewUser = mongoose.model("NewUser", userSchema);

//use a local strategy to authenticate the user using their username and password, also serialize and deserialize our user
passport.use(NewUser.createStrategy());

//serialize and deserialize only required when we are using sessions
//serialize will basically create the cookie and store the required user information
//deserialize will break the cookie to retrieve the required user information
passport.serializeUser(NewUser.serializeUser());
passport.deserializeUser(NewUser.deserializeUser());

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
})

app.get("/login", function(req, res) {
  res.render("login");
})

/* if session is still active i.e if cookie present, then user should be able to directly access the secrets page without
requiring to login again. But if the session is killed i.e cookie absent, then user should again login   */
app.get("/secrets", function(req, res) {
  if(req.isAuthenticated()) {
    res.render("secrets");
  }
  else {
    res.redirect("/login");
  }
});

//logout the user and end the session
app.get("/logout", function(req, res) {
  req.logout();
  console.log("User logged out succesfully!");
  res.redirect("/")
});

/*register the new user with his usernamr and Password,
the new username and password is created by passsport module itself using the register() in the background and saved to DB.
If registration is success then authenticate the new user using the passport local module and route user to secrets page
 */
app.post("/register", function(req, res) {
  console.log("username: " + req.body.username);
  NewUser.register({username: req.body.username}, req.body.password, function(err, user) {
    if(err) {
      console.log(err);
      res.redirect("/");
    }
    passport.authenticate("local")(req, res, function() {
      res.redirect("/secrets");
    });
  });
});

/*use the login() of the passport module and authenticate the user using the passport local module,
if the authenticaion is successfull then route the user to sercrets page*/
app.post("/login", function(req, res) {
  const newUser = new NewUser({
    username: req.body.username,
    password: req.body.password
  });
  req.login(newUser, function(err,){
    if(err) {
      console.log(err);
      res.render("login");
    }
    else {
      console.log("User Data sent for authentication!");
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(port, function() {
  console.log("Listening at port: " + port);
});
