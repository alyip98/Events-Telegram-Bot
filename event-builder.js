const Event = require("./event");
const moment = require("moment");

let i = 0;
MODE = {
  Idle: i++,
  Edit: i++,
  Create: i++,
  Name: i++,
  Tags: i++,
  Start: i++,
  End: i++,
  Venue: i++,
  Description: i++,
  Type: i++,
  Final: i++
};

class EventBuilder {
  constructor(creator, mode = MODE.Idle) {
    this.creator = creator;
    this.dateCreated = moment(Date.now()).toISOString();
    this.mode = mode;
  }

  static edit(event) {
    const eventBuilder = new EventBuilder(MODE.Edit);
    eventBuilder.fromObject(event);
    return eventBuilder;
  }

  fromObject(event) {
    this.creator = event.creator;
    this.dateCreated = event.dateCreated;
    this.name = event.name;
    this.tags = event.tags;
    this.start = event.start;
    this.end = event.end;
    this.venue = event.venue;
    this.description = event.description;
    this.type = event.type || "once";
  }

  accept(value) {
    switch (this.mode) {
      case MODE.Name:
        this.name = value;
        this.mode = MODE.Tags;
        break;
      case MODE.Tags:
        this.tags = value.split(", ");
        this.mode = MODE.Start;
        break;
      case MODE.Start:
        // TODO: Add error handling and re-prompting here and at Mode.End
        this.start = moment(value, "DDMMYYYY HHmm", true).toISOString();
        this.mode = MODE.End;
        break;
      case MODE.End:
        this.end = moment(value, "DDMMYYYY HHmm", true).toISOString();
        this.mode = MODE.Venue;
        break;
      case MODE.Venue:
        this.venue = value;
        this.mode = MODE.Description;
        break;
      case MODE.Description:
        this.description = value;
        this.mode = MODE.Type;
        break;
      case MODE.Type:
        this.type = value;
        this.mode = MODE.Final;
        break;
      default:
        throw new Error(`Mode does not accept values: ${this.mode}`);
    }
  }

  getMode() {
    return this.mode;
  }

  setMode(mode) {
    if (mode in MODE) {
      this.mode = MODE[mode];
    } else {
      this.mode = mode;
    }
  }

  finalize() {
    return new Event(
      this.name,
      this.tags,
      this.start,
      this.end,
      this.venue,
      this.description,
      this.type,
      this.creator,
      this.dateCreated
    );
  }
}

module.exports = {
  EventBuilder,
  MODE
};
