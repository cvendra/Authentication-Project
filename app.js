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

//packages for google and facebook authorization
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate")

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const dbName = "userDataBase";
const mongoose = require("mongoose");

//Use the session module in our project, location of the code in this file is important
app.use(session({
  secret: process.env.SECRET,     //SECRET is present in .env file for security
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
  },
  googleId: {          //this will hold the user googleId that comes from the google server
    type: String
  },
  facebookId: {       //this will hols the user facebookId that comes from the facebook server
    type: String
  }
});

/*tell our userSchema to use passportLocalMongoose as the plugin
passportLocalMongoose will do hashing and salting of our password and then save the new user to MongoDB
*/
userSchema.plugin(passportLocalMongoose);

/*tell our userSchema to use findOrCreate as the plugin
*/
userSchema.plugin(findOrCreate);

const NewUser = mongoose.model("NewUser", userSchema);

//use a local strategy to authenticate the user using their username and password, also serialize and deserialize our user
passport.use(NewUser.createStrategy());

/*serialize and deserialize only required when we are using sessions,
serialize will basically create the cookie and store the required user information,
deserialize will break the cookie to retrieve the required user information
*/
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  NewUser.findById(id, function(err, user) {
    done(err, user);
  });
});

/*configure GoogleStrategy
clientID and clientSecret are present inside .env file and their values we have dervied from Google Developer page
callbackURL is the url that must be rendered when the authorization is successful.
profile will have the details of that particular google user.
findOrCreate will help find the already existing googleId in case the user is already Registered
or it will create it if the googleId is not found in our DB i.e the case when he is not registered to our application.
this googleId will always come from the google server only.
*/
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log("profile: " + profile.email);
    NewUser.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

/*Below is the FacebookStrategy, and it will work in similar fashion as the Google one.
clientID and clientSecret are present inside .env file and their values we have dervied from Facebook Developer page
*/
passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_ID_FB,
    clientSecret: process.env.CLIENT_SECRET_FB,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    NewUser.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

/*initiaze authentication with google when user hits google button in our webpage.
here we are saying use passport to authenticate user using the google stragety that we have defined above
and when we hit google we want the users profile which includes their email and Id */
app.get("/auth/google", function (req, res) {
  passport.authenticate("google", {
  scope: ["profile"]})
});

/*initiaze authentication with facebook when user hits facebook button in our webpage.
here we are saying use passport to authenticate user using the facebbok stragety that we have defined above
and when we hit facebook we want the users email
*/
app.get("/auth/facebook", function(req, res) {
  passport.authenticate("facebook", {
  scope: ["email"] })
});

/*Once user has been authenticated by google in their server, they will direct the user to our website i.e /auth/google/secrets,
here it gets authenticated locally and we then save their login details using sessions and cookies
*/
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets page.
    res.redirect('/secrets');
  });

/*Once user has been authenticated by facebook in their server, they will direct the user to our website i.e /auth/facebook/secrets,
  here it gets authenticated locally and we then save their login details using sessions and cookies
*/
app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: '/login' }),
    function(req, res) {
      // Successful authentication, redirect to secrets page.
      res.redirect('/secrets');
  });

app.get("/register", function(req, res) {
  res.render("register");
});

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
