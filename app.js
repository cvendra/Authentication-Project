//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const port = 3000;
const app = express();
const _ = require("lodash");

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
        var myVar = new NewUser({
          email: req.body.username,
          password: req.body.password
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
        if(_.capitalize(req.body.password) === _.capitalize(foundItem.password)) {
            res.render("secrets");
        }
        else{
          console.log("Password dont match, Plz try again!");
          res.render("login");
        }
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
