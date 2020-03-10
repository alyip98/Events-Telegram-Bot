require("dotenv").config({ path: __dirname + "/.env" });
const TelegramBot = require("node-telegram-bot-api");
const moment = require("moment");
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const { MODE, EventBuilder } = require("./event-builder");
const { TRAITS, UserBuilder } = require("./user-builder");
const { getRegisterMessage, getBuilderMessage, replyWithEvents, buildKeyboard } = require("./util");
const Permissions = require("./permissions");

const fbEvents = require("./connect-firebase").ref("Events");
const fbUsers = require("./connect-firebase").ref("Users");

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

const sessions = {};
const registeredCallbacks = {};
const cachedTags = new Set();

function buildCachedTags() {
  fbEvents.getAllEvents()
    .then(events => {
      events.forEach(event => {
        event.tags.forEach(tag => {
          cachedTags.add(tag);
        })
      })
    })
}

// Pass in a single event
function sendNotificationsToUsers(users, event) {
  // Get all the users with IsMuted=No and with relevant tags and house.
  if (users.length) {
    return Promise.all(
      users.map(user => replyWithEvents(bot, user.telegramID, [event]))
    ).then(() => console.log(`Sent notifications to ${users.length} users`));
  }
  return Promise.resolve();
}

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
      rg.setTelegramIDAndPermissions(chatID, Permissions.NORMAL);
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
        eb.tags.forEach(tag => cachedTags.add(tag));
        const event = eb.finalize();
        fbEvents.putNewEvent(event)
          .then(() => bot.sendMessage(msg.chat.id, "Event added!"))
          .then(fbUsers.getUsersWithTags)
          .then(users => sendNotificationsToUsers(users, event));
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
  fbEvents.getAllEvents().then(events => replyWithEvents(bot, msg.chat.id, events));
});

bot.onText(/\/searchname/, (msg, match) => {
  const keyword = match.input.replace("/searchname", "").trim();

  if (!keyword) {
    bot.sendMessage(msg.chat.id, SEARCH_NAME_SYNTAX, {
      parse_mode: "HTML"
    });
    return;
  }
  fbEvents.getEventsByKeyword(keyword).then(events =>
    replyWithEvents(bot, msg.chat.id, events)
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
  fbEvents.getEventsByTag(keyword).then(events =>
    replyWithEvents(bot, msg.chat.id, events)
  );
});

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, WELCOME);
});

bot.onText(/\/create/, msg => {
  const session = getSession(msg.chat.id);
  session.isBuilding = true;
  session.builder = new EventBuilder(msg.chat.id, MODE.Name);
  bot.sendMessage(msg.chat.id, getBuilderMessage(session.builder.mode));
});

bot.onText(/\/register/, msg => {
  const session = getSession(msg.chat.id);
  session.isRegistering = true;
  session.register = new UserBuilder(TRAITS.Name);
  bot.sendMessage(msg.chat.id, getRegisterMessage(session.register.traits));
});

bot.onText(/\/subscribe/, msg => {
  console.log("subscribed");
  fbUsers.setUserIsMutedAttribute(msg.chat.id, false).then(() =>
    bot.sendMessage(msg.chat.id, "Successfully Subscribed!", {
      parse_mode: "HTML"
    })
  );
});

bot.onText(/\/unsubscribe/, msg => {
  console.log("unsubscribed");
  fbUsers.setUserIsMutedAttribute(msg.chat.id, true).then(() =>
    bot.sendMessage(msg.chat.id, "Successfully Unsubscribed!", {
      parse_mode: "HTML"
    })
  );
});

bot.onText(/\/debug/, msg => {
  console.log(cachedTags);
  bot.sendMessage(msg.chat.id, `tags: ${Array.from(cachedTags).join(", ")}`);
});

bot.on("callback_query", response => {
  const data = response.data;

  if (!data) {
    console.warn("Empty callback encountered");
    return;
  }
  const command = data.split(" ")[0];

  if (command in registeredCallbacks) {
    return registeredCallbacks[command](response, data);
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
    fbEvents.getEventsByDates(startingStart, endingStart).then(events =>
      replyWithEvents(bot, response.message.chat.id, events)
    );
  } else if (isWeekly === true) {
    fbEvents.getEventsByDay(data).then(events =>
      replyWithEvents(bot, response.message.chat.id, events)
    );
  }
});

registerCallback("command-view-all", response => {
  // Shows all upcoming events ordered by start date
  fbEvents.getAllEvents().then(events => {
    events = events.filter(event => moment(event.start) - moment() > 0)
      .sort((a, b) => moment(a.start) - moment(b.start));
    replyWithEvents(bot, response.message.chat.id, events);
  });
});

registerCallback("command-browse", response => {
  // TODO browse command
  const tagKeyboard = buildKeyboard(Array.from(cachedTags));
  bot.sendMessage(response.message.chat.id, "Tags", tagKeyboard);
});

registerCallback("browse-tags", (response, data) => {
  const splitData = data.split(" ");
  const tag = splitData.length > 1 ? splitData[1] : "";
  fbEvents.getEventsByTag(tag)
    .then(events => replyWithEvents(bot, response.message.chat.id, events))
    .then(() => console.log(data));
});

buildCachedTags();

console.log("Bot running");
