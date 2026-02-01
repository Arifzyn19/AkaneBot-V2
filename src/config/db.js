import { ENV } from "./env.js";
import db from "../lib/database.js";
import baileys from "@whiskeysockets/baileys";
import { jidNormalizedUser } from "../lib/helper.js";

const validators = {
  isNumber: (x) => typeof x === "number" && !isNaN(x),
  isBoolean: (x) => typeof x === "boolean",
  isString: (x) => typeof x === "string",
  isObject: (x) => typeof x === "object" && x !== null,
  isArray: (x) => Array.isArray(x),
};

const getDefaultUser = (m) => ({
  lastChat: new Date(),
  name: m.pushName || "Unknown",
  registered: false,
  age: 0,

  premium: m.isOwner ? true : false,
  VIP: m.isOwner ? true : false,
  banned: false,
  warning: 0,
  autolevelup: true,
  premiumTime: 0,

  level: 1,
  exp: 0,
  limit: 10,

  afk: -1,
  afkReason: "",

  cooldowns: {},
});

const getDefaultGroup = () => ({
  lastChat: new Date().getTime(),
  mute: false,
  welcome: true,
  leave: true,
  antilink: false,
  antispam: false,
  antibot: false,
  antitagsw: false,
  antisticker: false,
  nsfw: false,
  game: false,
  autolevelup: true,
});

const getDefaultSettings = () => ({
  firstchat: true,
  readstory: true,
  reactstory: false,
  autoread: false,
  self: false,
  owner: ["6285691464024"],
  ch_id: "120363181344949815@newsletter",
  ch_name: "Arifzyn Infomation",
  logo: "",
  developer: "Arifzyn.",
  packname: "YouTube : @arifzxa19",
  api: {},
});

export function syncDatabase(m, client) {
  // Initialize database structure if it doesn't exist
  if (!db.data) {
    db.data = {};
  }
  if (!validators.isObject(db.data.users)) {
    db.data.users = {};
  }
  if (!validators.isObject(db.data.groups)) {
    db.data.groups = {};
  }
  if (!validators.isObject(db.data.settings)) {
    db.data.settings = {};
  }

  // Sync user data
  let user = db.data.users[m.sender];
  if (!validators.isObject(user)) {
    db.data.users[m.sender] = getDefaultUser(m);
  } else {
    const defaultUser = getDefaultUser(m);
    for (const [key, value] of Object.entries(defaultUser)) {
      if (!(key in user) || typeof user[key] !== typeof value) {
        user[key] = value;
      }
    }
  }

  // Sync group data
  if (m.isGroup) {
    let group = db.data.groups[m.chat];
    if (!validators.isObject(group)) {
      db.data.groups[m.chat] = getDefaultGroup();
    } else {
      const defaultGroup = getDefaultGroup();
      for (const [key, value] of Object.entries(defaultGroup)) {
        if (!(key in group) || typeof group[key] !== typeof value) {
          group[key] = value;
        }
      }
    }
  }

  // Sync settings data
  const botId = client.user?.jid || client.user?.id;
  if (!botId) return;

  const numberBot = jidNormalizedUser(botId);

  let settings = db.data.settings[numberBot];
  if (!validators.isObject(settings)) {
    db.data.settings[numberBot] = getDefaultSettings();
  } else {
    const defaultSettings = getDefaultSettings();
    for (const [key, value] of Object.entries(defaultSettings)) {
      if (!(key in settings) || typeof settings[key] !== typeof value) {
        settings[key] = value;
      }
    }
  }
}
