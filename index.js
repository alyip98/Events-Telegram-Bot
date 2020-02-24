require("dotenv").config({ path: __dirname + "/.env" });

// Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;
const TelegramBot = require("node-telegram-bot-api");
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });
const moment = require("moment");
const { MODE, EventBuilder } = require("./event-builder");
const { TRAITS, UserBuilder } = require("./user-builder");
const sessions = {};

const {
  BROWSE_EVENTS_OPTIONS,
  DAILY_OPTIONS,
  WELCOME,
  WELCOME_COMMANDS,
  SEARCH_NAME_SYNTAX,
  SEARCH_TAG_SYNTAX,
  END_OF_QUERY,
  HOUSE_OPTIONS,
  YES_NO_OPTIONS,
  TAG_KEYWORD,
  TAG_EVENT_KEYWORD,
  NOTIFICATIONS_KEYWORD
} = require("./displayMessagesConstants");

const fb = require("./connect-firebase").ref("Events");
const fbUsers = require("./connect-firebase").ref("Users");

// Pass in a single event
function sendNotificationsToUsers(event) {
  // Get all the users with IsMuted=No and with relevant tags and house.
  return fbUsers
    .getAllUsers(event.tags)
    .then(usersTelegramIDs => {
      if (usersTelegramIDs.length) {
        Promise.all(
          usersTelegramIDs.map(chatID => replyWithEvents(chatID, [event]))
        );
      }
    })
    .catch(e => console.log(e));
}

function replyWithEvents(chatId, events) {
  if (events.length) {
    let combinedMessage = events.reduce(
      (acc, event) => acc + event.format() + "\n\n",
      ""
    );
    bot.sendMessage(chatId, combinedMessage, {
      parse_mode: "HTML"
    });
  } else {
    bot.sendMessage(chatId, END_OF_QUERY, {
      parse_mode: "HTML"
    });
  }
}

const registeredCallbacks = {};
function registerCallback(data, callback) {
  registeredCallbacks[data] = callback;
}

function registerUser(text, chatID, session) {
  const rg = session.register;
  if (rg) {
    try {
      rg.accept(text);
    } catch (e) {
      console.error(e);
    }
    if (rg.traits === TRAITS.Final) {
      rg.setTelegramIDAndPermissions(chatID, "Normal User");
      session.isRegistering = false;
      fbUsers.putNewUser(rg.finalize()).then(test => {
        bot.sendMessage(chatID, "Successfully registered!");
      });
    } else if (rg.traits === TRAITS.House) {
      bot.sendMessage(chatID, getRegisterMessage(rg.traits), HOUSE_OPTIONS);
    } else if (rg.traits === TRAITS.IsMuted) {
      bot.sendMessage(chatID, getRegisterMessage(rg.traits), YES_NO_OPTIONS);
    } else {
      bot
        .sendMessage(chatID, getRegisterMessage(rg.traits))
        .catch(console.error);
    }
  }
}

// Listen for any kind of message.
bot.on("message", msg => {
  const chatId = msg.chat.id;
  const session = getSession(chatId);

  if (msg.text.toLowerCase() === "exit") {
    // User wants to stop registering/adding event
    session.isBuilding = false;
    session.builder = null;
    session.isRegistering = false;
    session.register = null;
  }

  if (session.isBuilding) {
    const eb = session.builder;
    if (eb) {
      try {
        eb.accept(msg.text);
      } catch (e) {
        console.error(e);
      }
      if (eb.mode === MODE.Final) {
        session.isBuilding = false;
        fb.putNewEvent(eb.finalize())
          .then(() => {
            bot.sendMessage(msg.chat.id, "Event added!");
          })
          .then(() => {
            // Send notifications to users
            sendNotificationsToUsers(eb.finalize());
          });
      } else
        bot
          .sendMessage(msg.chat.id, getBuilderMessage(eb.mode))
          .catch(console.error);
    }
  } else if (session.isRegistering) {
    registerUser(msg.text, msg.chat.id, session);
  } else if (!msg.entities) {
    bot.sendMessage(chatId, WELCOME, WELCOME_COMMANDS);
  }
});

bot.onText(/\/events/, msg => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Select one", BROWSE_EVENTS_OPTIONS);
});

bot.onText(/\/weekly/, msg => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Select one", DAILY_OPTIONS);
});

bot.onText(/\/allevents/, msg => {
  fb.getAllEvents().then(events => replyWithEvents(msg.chat.id, events));
});

bot.onText(/\/searchname/, (msg, match) => {
  const keyword = match.input.replace("/searchname", "").trim();

  if (!keyword) {
    bot.sendMessage(msg.chat.id, SEARCH_NAME_SYNTAX, {
      parse_mode: "HTML"
    });
    return;
  }
  fb.getEventsByKeyword(keyword).then(events =>
    replyWithEvents(msg.chat.id, events)
  );
});

bot.onText(/\/searchtag/, (msg, match) => {
  const keyword = match.input.replace("/searchtag", "").trim();
  if (!keyword) {
    bot.sendMessage(msg.chat.id, SEARCH_TAG_SYNTAX, {
      parse_mode: "HTML"
    });
    return;
  }
  fb.getEventsByTag(keyword).then(events =>
    replyWithEvents(msg.chat.id, events)
  );
});

bot.onText(/\/create/, msg => {
  const session = getSession(msg.chat.id);
  session.isBuilding = true;
  session.builder = new EventBuilder(MODE.Name);
  bot.sendMessage(msg.chat.id, getBuilderMessage(session.builder.mode));
});

bot.onText(/\/start/, msg => {
  const session = getSession(msg.chat.id);
  session.isRegistering = true;
  session.register = new UserBuilder(TRAITS.Name);
  bot.sendMessage(msg.chat.id, getRegisterMessage(session.register.traits));
});

bot.onText(/\/subscribe/, msg => {
  console.log("subscribed");
  fbUsers.setUserIsMutedAttribute(msg.chat.id, "No").then(() =>
    bot.sendMessage(msg.chat.id, "Successfully Subscribed!", {
      parse_mode: "HTML"
    })
  );
});

bot.onText(/\/unsubscribe/, msg => {
  console.log("unsubscribed");
  fbUsers.setUserIsMutedAttribute(msg.chat.id, "Yes").then(() =>
    bot.sendMessage(msg.chat.id, "Successfully Unsubscribed!", {
      parse_mode: "HTML"
    })
  );
});

bot.on("callback_query", response => {
  const data = response.data;

  if (data in registeredCallbacks) {
    return registeredCallbacks[data](response);
  }

  bot.sendMessage(response.message.chat.id, "You selected " + data);

  const chatId = response.message.chat.id;
  const session = getSession(chatId);
  if (session.isRegistering) {
    return registerUser(data, chatId, session);
  }

  let startingStart;
  let endingStart;
  let isWeekly = false;
  if (data === "Today") {
    startingStart = moment(new Date()).format("YYYY-MM-DD");
    endingStart = startingStart;
  } else if (data === "This Week") {
    // Start of the week
    startingStart = moment()
      .weekday(0)
      .format("YYYY-MM-DD");
    // End of the week
    endingStart = moment()
      .weekday(7)
      .format("YYYY-MM-DD");
  } else if (data === "Last Week") {
    // Start of Last week
    startingStart = moment()
      .weekday(-7)
      .format("YYYY-MM-DD");
    // End of Last Week
    endingStart = moment()
      .weekday(0)
      .format("YYYY-MM-DD");
  } else if (data === "This Month") {
    startingStart = moment()
      .startOf("month")
      .format("YYYY-MM-DD");
    endingStart = moment()
      .endOf("month")
      .format("YYYY-MM-DD");
  } else {
    // Case of searching by Day for weekly events
    isWeekly = true;
  }

  // Start searching Firebase
  if (isWeekly === false) {
    fb.getEventsByDates(startingStart, endingStart).then(events =>
      replyWithEvents(response.message.chat.id, events)
    );
  } else if (isWeekly === true) {
    fb.getEventsByDay(data).then(events =>
      replyWithEvents(response.message.chat.id, events)
    );
  }
});

registerCallback("command-view-all", response => {
  fb.getAllEvents().then(events =>
    replyWithEvents(response.message.chat.id, events)
  );
});

registerCallback("command-browse", response => {});

function getSession(id) {
  if (id in sessions) {
    return sessions[id];
  } else {
    return newSession(id);
  }
}

function newSession(id) {
  sessions[id] = {
    id,
    isBuilding: false,
    builder: null,
    isRegistering: false,
    register: null
  };

  return sessions[id];
}

function getBuilderMessage(mode) {
  let key = "";
  for (let i in MODE) {
    if (MODE.hasOwnProperty(i) && MODE[i] === mode) {
      if (i == "Start") {
        key = "Please enter start date time"; // TO EDIT -> Let user know format?
      } else if (i == "End") {
        key = "Please enter end date time";
      } else if (i == "Tags") {
        key = TAG_EVENT_KEYWORD;
      } else if (i == "Type") {
        key =
          "Enter 'once' if it is a one time event. Otherwise, enter 'weekly'. (Without apostrophe)";
      } else {
        key = `Please enter event ${i.toLowerCase()}`;
      }
      break;
    }
  }
  return key;
}

function getRegisterMessage(traits) {
  let key = "";
  for (let i in TRAITS) {
    if (TRAITS.hasOwnProperty(i) && TRAITS[i] === traits) {
      if (i == "IsMuted") {
        key = NOTIFICATIONS_KEYWORD;
      } else if (i == "Tags") {
        key = TAG_KEYWORD;
      } else {
        key = `Please enter your ${i.toLowerCase()}`;
      }
      break;
    }
  }
  return key;
}
