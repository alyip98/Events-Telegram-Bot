const {putNewEvent} = require("./connect-firebase");

require("dotenv").config({ path: __dirname + "/.env" });

// Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;
// const TelegramBot = require("node-telegram-bot-api");
// Create a bot that uses 'polling' to fetch new updates
// const bot = new TelegramBot(token, { polling: true });
const moment = require("moment");
const Event = require("./event")

const {
  WELCOME,
  SEARCH_NAME_SYNTAX,
  SEARCH_TAG_SYNTAX,
  END_OF_QUERY
} = require("./displayMessagesConstants");

const {
  getAllEvents,
  getTagEvents,
  getEventsByDates,
  getEventsByDay
} = require("./connect-firebase");

const fbUsers = require("./connect-firebase").ref("Users");

// fbUsers.getUserKeyByChatID(371790126).then(console.log);

fbUsers.getUsersWithTags().then(users => {
  console.log(users);
});

// function assert(a, b) {
//   if (a !== b) {
//     throw new Error(`Failed assert ${a} === ${b}`);
//   }
// }

// getAllEvents().then(console.log);

// const sampleEvents = require("./testData");
//
// for (let i in sampleEvents.events) {
//   let event = Event.fromJSON(sampleEvents.events[i]);
//   putNewEvent(event).then(err => {
//     if (!err) {
//       console.log(`Event (${event.name}) added to database`);
//       console.log(event.toJSON())
//     }
//   });
// }
