// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";
import {getAuth, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHvZwa_9_PHOASX7SSTCb7q9LwAvgHwRE",
  authDomain: "websec-chat.firebaseapp.com",
  databaseURL: "https://websec-chat-default-rtdb.firebaseio.com",
  projectId: "websec-chat",
  storageBucket: "websec-chat.appspot.com",
  messagingSenderId: "591227046358",
  appId: "1:591227046358:web:c956c19f270b07ff6b3c77"
};

// == Initialize Firebase ==
const app = initializeApp(firebaseConfig);

const db = rtdb.getDatabase(app);
const titleRef = rtdb.ref(db, "/");
const channelsRef = rtdb.child(titleRef, "channels");
//const messagesRef = rtdb.child(titleRef, "messages");
const usersRef = rtdb.child(titleRef, "users");

let currChannelRef = null; // ref for whatever the currently viewed channel is at any given time
let currMessagesRef = null;

const auth = getAuth();
onAuthStateChanged(auth, (usr) => { // automatically log in if authed
  if(usr) {
    user = usr;
    initChatFeed();
  }
});


// User data (move to cloud verification at some point)
let user = null;
let uidToDisplayname = {}; // dictionary that maps uids to display names so we're not constantly asking the db
let loggedin = false;

// == Set up event listeners ==
// Email & Password login
$("#login-submit").click(loginSubmit);
$("#login-email").keypress(function(event) {
  if(event.which == 13) {
    event.preventDefault();
    $("#login-password").focus();
  }
});
$("#login-password").keypress(function(event) {
  if(event.which == 13) {
    event.preventDefault();
    loginSubmit();
  }
});

$(".show-register").click(function() {
  $("#login").hide();
  $("#register").show();
});

// Register
$("#register-submit").click(registerSubmit);
$("#register-email").keypress(function(event) {
  if(event.which == 13) {
    event.preventDefault();
    $("#register-password").focus();
  }
});
$("#register-password").keypress(function(event) {
  if(event.which == 13) {
    event.preventDefault();
    $("#register-password-confirm").focus();
  }
});
$("#register-password-confirm").keypress(function(event) {
  if(event.which == 13) {
    event.preventDefault();
    registerSubmit();
  }
});

$(".show-login").click(function() {
  $("#register").hide();
  $("#forgot-password").hide();
  $("#login").show();
});

// Password reset
$("#forgot-email").keypress(function(event) {
  if(event.which == 13) {
    event.preventDefault();
    sendPasswordEmail();
  }
});
$("#forgot-email-submit").click(sendPasswordEmail);

$(".reset-password").click(function() {
  $("#login").hide();
  $("#forgot-password").show();
});


// Signout button
$("#signout-button").click(function() {
  signOut(auth).then(function() {
    window.location.reload(true); // easiest way to boot back to login page
  });
});

// Message send
$("#message-send").click(function() {
  sendMessage();
});
$("#message-text").keypress(function(event) {
  if(event.which == 13) {
    event.preventDefault();
    sendMessage();
  }
});

// Channel switcher
$("#channel-select").change(function() {
  let selectBox = $("#channel-select")[0];
  let optionId = selectBox[selectBox.selectedIndex].id;
  setChannel(optionId);
});

// == Utility functions ==
// Attempt to prevent XSS. Pass every string the user has any control over through this
function sanitizeString(str) {
  // Shamelessly taken from stackoverflow: https://stackoverflow.com/questions/6221067/display-html-markup-in-browser-without-it-being-rendered
  // Hope it works!
  if(!str) {
    console.log("Warning: str in sanitizeString doesn't exist!");
    return "placeholder";
  }

  return str.replace(/[<>&\n]/g, function(x) {
    return {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;'
    }[x];
  });
}

// Initializes the chat feed, only called upon login/page load
function initChatFeed() {
  // for some reason, this function is getting run twice if logging in from scratch
  // this is just a measure to make sure that doesn't happen since I can't figure out why
  if(loggedin) {
    return;
  }

  currChannelRef = rtdb.child(channelsRef, "main");
  currMessagesRef = rtdb.child(currChannelRef, "messages");

  rtdb.onChildAdded(currMessagesRef, ss => {
    renderMessage(ss.key, ss.toJSON());
    $("#chat-feed").scrollTop($("#chat-feed")[0].scrollHeight) // scroll to new message
  });

  $("#start-view").hide();
  $("#chat-view").show();

  $('#message-text').focus();

  getDisplayName(user.uid).then((name) => {
    $('#current-user').html(sanitizeString(name));
  });

  rtdb.onChildAdded(channelsRef, (ss) => {
    let option = document.createElement("option");
    option.innerHTML = sanitizeString(ss.toJSON().name);
    option.id = ss.key;
    $("#channel-select").append(option);
  });

  loggedin = true;
}

// Sends a message to the current channel
function sendMessage() {
  let msgText = $('#message-text').val().trim();

  // don't accept empty messages
  if(msgText.length < 1) {
    return;
  }

  // make sure it's not a command (we don't want valid commands being posted to chat, but we do want to embarrass people who mistype commands :) )
  if(parseForCommand(msgText)) {
    return;
  }

  let msgObj = {
    author: user.uid,
    content: msgText,
    time: new Date().getTime()
  };

  rtdb.push(currMessagesRef, msgObj);
  $('#message-text')[0].value = "";
}

// Checks if str is a valid chat command, runs the command if it is
// Returns false if not a valid command, true if it is
function parseForCommand(str) {
  if(!str.startsWith('/')) {
    return false;
  }

  let split = str.split(" ");
  if(split.length != 2) {
    return false;
  }
  else if(split[0] == "/createchannel") {
    let channelName = split[1];
    if(channelName.length < 1 || channelName.length > 50) {
      return;
    }

    createChannel(channelName);

    $('#message-text')[0].value = "";
    return true;
  }

  return false;
}

// Renders the given message to the page
function renderMessage(msgId, msgObj) {
  let msgContainer = document.createElement("div");
  msgContainer.id = msgId;
  msgContainer.className = "message-container";
  getDisplayName(msgObj.author).then((name) => {
    msgContainer.innerHTML = "<b>" + sanitizeString(name) + "</b>: " + sanitizeString(msgObj.content) + " | sent at " + sanitizeString(msgObj.time.toString());
    $('#chat-feed').append(msgContainer);
  })
}

// Submit login info
function loginSubmit() {
  let loginEmail = $("#login-email").val().trim();
  let loginPassword = $("#login-password").val();

  signInWithEmailAndPassword(auth, loginEmail, loginPassword)
    .then((userCredential) => {
      user = userCredential.user;
      console.log("Logged in successfully");
      initChatFeed();
    })
    .catch((error) => {
      console.log("Login failed: " + error.message);
    }
  );
}

// Submit registration info
function registerSubmit() {
  let registerEmail = $("#register-email").val().trim();
  let registerUsername = $("#register-username").val().trim();

  // let's not have empty usernames
  if(registerUsername.length < 1) {
    return;
  }

  // Confirm passwords match
  let registerPassword = $("#register-password").val();
  let registerPasswordConfirm = $("#register-password-confirm").val();

  if(registerPassword != registerPasswordConfirm) {
    return;
  }

  createUserWithEmailAndPassword(auth, registerEmail, registerPassword)
    .then((userCredential) => {
      user = userCredential.user;
      console.log("Registered successfully");

      // Create user in database
      if(user.uid) {
        let newUserRef = rtdb.child(usersRef, user.uid.toString());
        rtdb.set(newUserRef, {
          displayName: registerUsername,
          role: "user"
        });
      }

      initChatFeed();
    })
    .catch((error) => {
      console.log("Register failed: " + error.message);
    }
  );
}

// Send email for forgotten password
function sendPasswordEmail() {
  sendPasswordResetEmail(auth, $("#forgot-email").val().trim())
    .then(function() {
      console.log("I guess it sent?");
    })
    .catch((error) => {
      console.log(error.message);
    }
  );
}

// Handles everything related to changing channels
// (clear messages, disconnect listener for previous channel, set up new channel)
function setChannel(channelId) {
  console.log("set channel to " + channelId);

  // disconnect previous channel
  rtdb.off(currChannelRef);
  rtdb.off(currMessagesRef);

  // clear messages
  $("#chat-feed").empty();

  // set new refs and listener
  currChannelRef = rtdb.child(channelsRef, channelId);
  currMessagesRef = rtdb.child(currChannelRef, "messages");

  rtdb.onChildAdded(currMessagesRef, ss => {
    renderMessage(ss.key, ss.toJSON());
    $("#chat-feed").scrollTop($("#chat-feed")[0].scrollHeight) // scroll to new message
  });
}

// Creates a new channel with the given name
function createChannel(channelName) {
  console.log("create channel " + channelName);
}

// Gets the display name associated with the given user ID
// Don't really want this to be async but this seemed like the best way without doing something much more complicated
// Given how small this project is and how few messages/users will be posted, it'd probably have been simpler to just hit the database every time
async function getDisplayName(uid) {
  let displayName = uidToDisplayname[uid];

  if(displayName) {
    return displayName;
  }
  else {
    let ref = rtdb.child(usersRef, uid);
    let result = await rtdb.get(ref);
    displayName = result.toJSON().displayName;
    uidToDisplayname[uid] = displayName;
    return displayName;
  }
}