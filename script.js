// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-app.js";
import * as rtdb from "https://www.gstatic.com/firebasejs/9.0.2/firebase-database.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = rtdb.getDatabase(app);
const titleRef = rtdb.ref(db, "/");
const messagesRef = rtdb.child(titleRef, "messages");

// User data (move to cloud verification at some point)
let username = "";
let loggedIn = false;


/**
 * Set up event listeners
 */
$("#username-submit").click(function() {
  username = $("#username-text").val().trim();

  //alert(username);

  // Validate username length
  if(username.length < 3 || username.length > 30) {
    return; // TODO: show error message
  }

  //TODO: Animate this. Have the onboarding screen slide up or something
  $("#login-view").hide();
  $("#chat-view").show();

  loggedIn = true;
  initChatFeed();
});

$("#message-send").click(function() {
  sendMessage();
});


/**
 * Utility functions
 */
function sanitizeString(str) {
  // Shamelessly taken from stackoverflow: https://stackoverflow.com/questions/6221067/display-html-markup-in-browser-without-it-being-rendered
  // Hope it works!
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
  });
}

function sendMessage() {
  let msgText = $('#message-text').val().trim();
  if(msgText.length < 1) {
    return;
  }

  let msgObj = {
    author: username,
    content: msgText,
    time: new Date().getTime()
  };

  let newMsg = rtdb.push(messagesRef, msgObj);
}

function renderMessage(msgId, msgObj) {
  let msgContainer = document.createElement("div");
  msgContainer.id = msgId;
  msgContainer.class = "message-container";
  msgContainer.innerHTML = "<b>" + sanitizeString(msgObj.author) + "</b>: " + sanitizeString(msgObj.content) + " | sent at " + msgObj.time;
  $('#chat-feed').append(msgContainer);
}
