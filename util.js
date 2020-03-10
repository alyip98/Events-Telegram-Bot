const { END_OF_QUERY } = require("./displayMessagesConstants");

function getBuilderMessage(mode) {
  let key = "";
  for (let i in MODE) {
    if (MODE.hasOwnProperty(i) && MODE[i] === mode) {
      if (i == "Start") {
        key = "Please enter start date time (DDMMYYYY HHmm) e.g. 06031998 1325 for 6 March 1998 1:25 pm";
      } else if (i == "End") {
        key = "Please enter end date time (DDMMYYYY HHmm) e.g. 06031998 1325 for 6 March 1998 1:25 pm";
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

function replyWithEvents(bot, chatId, events) {
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

function buildKeyboard(tags) {
  return {
    reply_markup: {
      one_time_keyboard: true,
      inline_keyboard: [
        tags.map(i => { return {'text': i, 'callback_data': `browse-tags ${i}`}; })
      ]
    }
  }
}

module.exports = { getBuilderMessage, getRegisterMessage, replyWithEvents, buildKeyboard };
