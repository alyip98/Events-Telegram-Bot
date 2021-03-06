module.exports = {
  WELCOME: "Welcome to RVRC's very own event bot. You can /register to get notified when new events are created and to create your own events, or simply browse upcoming events right away!",
  WELCOME_COMMANDS: {
    reply_markup: {
      one_time_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "View All",
            callback_data: "command-view-all"
          },
          {
            text: "Browse",
            callback_data: "command-browse"
          }
        ]
      ]
    }
  },
  HOUSE_OPTIONS: {
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [
        [
          {
            text: "Rusa",
          },
          {
            text: "Panthera",
          },
          {
            text: "Aonyx",
          },
          {
            text: "Chelonia",
          },
          {
            text: "Strix",
          }
        ]
      ]
    }
  },
  BROWSE_EVENTS_OPTIONS: {
    reply_markup: {
      one_time_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "Today",
            callback_data: "Today"
          }
        ],
        [
          {
            text: "Last Week",
            callback_data: "Last Week"
          }
        ],
        [
          {
            text: "This Week",
            callback_data: "This Week"
          }
        ],
        [
          {
            text: "This Month",
            callback_data: "This Month"
          }
        ]
      ]
    }
  },
  YES_NO_OPTIONS: {
    reply_markup: {
      one_time_keyboard: true,
      inline_keyboard: [
        [
          {
            text: "Yes",
            callback_data: "Yes"
          }
        ],
        [
          {
            text: "No",
            callback_data: "No"
          }
        ]
      ]
    }
  },
  SEARCH_NAME_SYNTAX: "Please add a keyword behind: /searchname keyword",
  SEARCH_TAG_SYNTAX: "Please add a keyword behind: /searchtag keyword",
  END_OF_QUERY: "🌅<i>~No Events Found!~</i>🌄",
  TAG_KEYWORD: // TODO: Rephrase this
    "Please enter keywords of events that you are interested in (separated by a comma)",
  TAG_EVENT_KEYWORD: "Please enter keywords associated with this event",
  NOTIFICATIONS_KEYWORD: "Do you want to mute notifications?"
};
