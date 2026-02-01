import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import os from "os";
import { createRequire } from "module";

/**
 * @param {ImportMeta | string} pathURL
 * @param {boolean?} rmPrefix if value is `'true'`, it will remove `'file://'` prefix, if windows it will automatically false
 */
const __filename = function filename(
  pathURL = import.meta,
  rmPrefix = os.platform() !== "win32",
) {
  const path =
    /** @type {ImportMeta} */ (pathURL).url || /** @type {String} */ (pathURL);
  return rmPrefix
    ? /file:\/\/\//.test(path)
      ? fileURLToPath(path)
      : path
    : /file:\/\/\//.test(path)
      ? path
      : pathToFileURL(path).href;
};

/** @param {ImportMeta | string} pathURL */
const __dirname = function dirname(pathURL) {
  const dir = __filename(pathURL, true);
  const regex = /\/$/;
  return regex.test(dir)
    ? dir
    : fs.existsSync(dir) && fs.statSync(dir).isDirectory()
      ? dir.replace(regex, "")
      : path.dirname(dir); // windows
};

/** @param {ImportMeta | string} dir */
const __require = function require(dir = import.meta) {
  const path =
    /** @type {ImportMeta} */ (dir).url || /** @type {String} */ (dir);
  return createRequire(path);
};

export function isNumber() { 
  const int = parseInt(this);
  return typeof int === "number" && !isNaN(int);
}

export function getRandom() {
  if (Array.isArray(this) || this instanceof String)
    return this[Math.floor(Math.random() * this.length)];
  return Math.floor(Math.random() * this);
}

export function jidDecode (jid) {
  const sepIdx = typeof jid === "string" ? jid.indexOf("@") : -1;
  if (sepIdx < 0) {
    return undefined;
  }
  const server = jid.slice(sepIdx + 1);
  const userCombined = jid.slice(0, sepIdx);
  const [userAgent, device] = userCombined.split(":");
  const user = userAgent.split("_")[0];
  return {
    server: server,
    user,
    domainType: server === "lid" ? 1 : 0,
    device: device ? +device : undefined,
  };
}

export function jidEncode (user, server, device, agent) {
    return `${user || ''}${!!agent ? `_${agent}` : ''}${!!device ? `:${device}` : ''}@${server}`;
}

export function jidNormalizedUser (jid) {
    const result = jidDecode(jid);
    if (!result) {
        return '';
    }
    const { user, server } = result;
    return jidEncode(user, server === 'c.us' ? 's.whatsapp.net' : server);
}

export const areJidsSameUser = (jid1, jid2) =>
  jidDecode(jid1)?.user === jidDecode(jid2)?.user
  
export function extractMessageContent(message) {
  if (!message) return null;
  
  // Jika message sudah dalam bentuk yang benar, return langsung
  if (message.conversation || 
      message.extendedTextMessage || 
      message.imageMessage || 
      message.videoMessage || 
      message.audioMessage ||
      message.documentMessage ||
      message.stickerMessage ||
      message.buttonsMessage ||
      message.listMessage ||
      message.templateMessage) {
    return message;
  }
  
  // Jika ada ephemeralMessage atau viewOnceMessage, ekstrak isinya
  if (message.ephemeralMessage) {
    return extractMessageContent(message.ephemeralMessage.message);
  }
  
  if (message.viewOnceMessage) {
    return extractMessageContent(message.viewOnceMessage.message);
  }
  
  if (message.viewOnceMessageV2) {
    return extractMessageContent(message.viewOnceMessageV2.message);
  }
  
  if (message.viewOnceMessageV2Extension) {
    return extractMessageContent(message.viewOnceMessageV2Extension.message);
  }
  
  if (message.documentWithCaptionMessage) {
    return extractMessageContent(message.documentWithCaptionMessage.message);
  }
  
  if (message.editedMessage) {
    return extractMessageContent(message.editedMessage.message?.protocolMessage?.editedMessage);
  }
  
  return message;
}

export default {
  __filename,
  __dirname,
  __require,
};
