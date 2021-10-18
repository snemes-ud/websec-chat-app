// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";
import {getAuth, createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-auth.js";

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
const messagesRef = rtdb.child(titleRef, "messages");
const usersRef = rtdb.child(titleRef, "users");

const auth = getAuth();
onAuthStateChanged(auth, (usr) => { // automatically log in if authed
  if(usr) {
    user = usr;
    initChatFeed();
  }
});

//const googleProvider = new GoogleAuthProvider();


// User data (move to cloud verification at some point)
let user = null;
let uidToDisplayname = {}; // dictionary that maps uids to display names so we're not constantly asking the db

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

$("#show-register").click(function() {
  $("#login").hide();
  $("#register").show();
});

// Google login
$("#google-login").click(function() {

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

$("#show-login").click(function() {
  $("#register").hide();
  $("#login").show();
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

// == Utility functions ==
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

function initChatFeed() {
  rtdb.onChildAdded(messagesRef, ss => {
    renderMessage(ss.key, ss.toJSON());
    $("#chat-feed").scrollTop($("#chat-feed")[0].scrollHeight) // scroll to new message
  });

  $("#start-view").hide();
  $("#chat-view").show();

  $('#message-text').focus();

  getDisplayName(user.uid).then((name) => {
    $('#current-user').html(sanitizeString(name));
  });
}

function sendMessage() {
  let msgText = $('#message-text').val().trim();
  if(msgText.length < 1) {
    return;
  }

  let msgObj = {
    author: user.uid,
    content: msgText,
    time: new Date().getTime()
  };

  rtdb.push(messagesRef, msgObj);
  $('#message-text')[0].value = "";
}

function renderMessage(msgId, msgObj) {
  let msgContainer = document.createElement("div");
  msgContainer.id = msgId;
  msgContainer.className = "message-container";
  getDisplayName(msgObj.author).then((name) => {
    msgContainer.innerHTML = "<b>" + sanitizeString(name) + "</b>: " + sanitizeString(msgObj.content) + " | sent at " + sanitizeString(msgObj.time.toString());
    $('#chat-feed').append(msgContainer);
  })
}

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

function registerSubmit() {
  let registerEmail = $("#register-email").val().trim();
  let newDisplayName = registerEmail.split("@")[0];

  // Confirm passwords match
  let registerPassword = $("#register-password").val();
  let registerPasswordConfirm = $("#register-password-confirm").val();

  if(registerPassword != registerPasswordConfirm || registerPassword.length < 4) {
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
          displayName: newDisplayName,
        });
      }

      initChatFeed();
    })
    .catch((error) => {
      console.log("Register failed: " + error.message);
    }
  );
}

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