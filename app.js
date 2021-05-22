//jshint esversion:6

require("dotenv").config();         //this will be used by .env file
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const port = 3000;
const app = express();
const _ = require("lodash");
const bcrypt = require("bcrypt");
const saltRounds = 10;            //10 rounds of salting+hashing for the user password

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const dbName = "userDataBase";
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/" + dbName, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useNewUrlParser: true,
  useFindAndModify: false
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log(dbName + " connection successful!");
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Why no email-ID?"]
  },
  password: {
    type: String,
    required: [true, "Why no password?"]
  }
});

const NewUser = mongoose.model("NewUser", userSchema);

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/register", function(req, res) {
  res.render("register");
})

app.get("/login", function(req, res) {
  res.render("login");
})

app.post("/register", function(req, res) {
  NewUser.findOne({email: req.body.username}, function(err, foundItem) {
    if(!err) {
      if(!foundItem) {
        bcrypt.hash(req.body.password, saltRounds, function(err, hash) {   //hash is the final crypted password to be stored in DB
          var myVar = new NewUser({
            email: req.body.username,
            password: hash
          });

          myVar.save(function(err) {
            if(!err) {
              console.log("New user saved to " + dbName);
              res.render("secrets");
            }
            else {
              console.log(err);
              res.render(err);
            }
          });
       });
      }
      else if (foundItem) {
        console.log(req.body.username + " is already registerd in DB!");
        res.render("login");
      }
    }
    else {
      console.log(err);
      res.render(err);
    }
  });
});

app.post("/login", function(req, res) {
  NewUser.findOne({email: req.body.username}, function(err, foundItem) {
    if(!err) {
      if(!foundItem) {
        console.log(req.body.username + " is not found in DB!");
  //      res.write(req.body.username + "is not found in DB, Kindly register first!");
        res.render("register");
      }
      else if(foundItem){
        console.log("email-id " + foundItem.email + " found");
        bcrypt.compare(req.body.password, foundItem.password, function(err, result) {
          if(!err) {
            if(result) {           //result will depict if user password is same as DB stored password
              res.render("secrets");
            }
            else {
              console.log("Password dont match, Plz try again!");
              res.render("login");
            }
          }
          else {
            console.log(err);
            res.render(err);
          }
        });
      }
    }
    else {
      console.log(err);
      res.render(err);
    }
  });
});

app.listen(port, function() {
  console.log("Listening at port: " + port);
});
