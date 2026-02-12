import baileys, {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
} from "@whiskeysockets/baileys"
import { makeInMemoryStore } from "@rodrigogs/baileys-store"
import { Boom } from "@hapi/boom"
import qrcode from "qrcode-terminal"
import pino from "pino"
import gradient from "gradient-string"
import chalk from "chalk"
import { ENV } from "../config/env.js"
import { Client, protoType } from "./client.js"
import fs from "fs"

export class BaileysClient {
  constructor() {
    this.sock = null
    this.store = null
    this.isConnected = false
    this.qrRetries = 0
    this.maxQrRetries = 5
    this.sessionPath = ENV.session || "session"
    this.pairingCodeRequested = false
    this.botInstance = null
    this.state = null
    this.saveCreds = null

    this.logger = pino({
      level: "fatal",
      timestamp: () => `,"time":"${new Date().toISOString()}\"`,
    }).child({ class: "client" })

    this.initializeAuthState()
  }

  setBotInstance(botInstance) {
    this.botInstance = botInstance
  }

  async initializeAuthState() {
    const { state, saveCreds } = await useMultiFileAuthState("./" + this.sessionPath)

    this.state = state
    this.saveCreds = saveCreds
  }

  async initialize() {
    console.log("Initializing WhatsApp Bot...")

    protoType()

    this.store = makeInMemoryStore({
      logger: this.logger.child({ level: "silent" }),
    })

    await this.initializeAuthState()

    await this.connect()
  }

  async connect() {
    try {
      if (!this.state || !this.saveCreds) {
        throw new Error("Auth state not initialized")
      }

      this.sock = baileys({
        logger: this.logger.child({ level: "silent" }),
        browser: Browsers.ubuntu("Chrome"),
        printQRInTerminal: ENV.PRINT_QR || false,
        auth: {
          creds: this.state.creds,
          keys: makeCacheableSignalKeyStore(this.state.keys, this.logger),
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        retryRequestDelayMs: 10,
        transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
        maxMsgRetryCount: 15,
        appStateMacVerification: {
          patch: true,
          snapshot: true,
        },
        getMessage: async (key) => {
          if (this.store) {
            const msg = await this.store.loadMessage(key.remoteJid, key.id)
            return msg?.message || undefined
          }
          return undefined
        },
      })

      if (this.store) {
        this.store.bind(this.sock.ev, {
          groupMetadata: this.sock.groupMetadata,
        })
        
        this.sock.store = this.store
      }

      this.sock = Client({ client: this.sock, store: this.store })

      if (ENV.USE_PAIRING_CODE && !this.sock.authState.creds.registered && !this.pairingCodeRequested) {
        const phoneNumber = ENV.PAIRING_NUMBER.replace(/[^0-9]/g, "")

        console.log("phoneNumber :", phoneNumber)
        if (phoneNumber) {
          this.pairingCodeRequested = true

          setTimeout(async () => {
            try {
              const code = (await (await this.sock.requestPairingCode(phoneNumber))?.match(/.{1,4}/g)?.join("-")) || ""
              console.log(gradient.passion("\n🔑 Your Pairing Code: "), chalk.bold.green(code))
              console.log(chalk.yellow(`📱 Open WhatsApp > Settings > Linked Devices > Link Device`))
            } catch (error) {
              console.error("Failed to request pairing code:", error.message)
              this.pairingCodeRequested = false
            }
          }, 3000)
        } else {
          console.log(chalk.red("PAIRING_NUMBER is required when USE_PAIRING_CODE is true"))
        }
      }

      // Handle connection updates
      this.sock.ev.on("connection.update", async (update) => {
        await this.handleConnectionUpdate(update)
      })

      // Handle credentials update
      this.sock.ev.on("creds.update", this.saveCreds)

      // Handle messages
      this.sock.ev.on("messages.upsert", async ({type, messages}) => {
        if (type == "notify") { // new messages
          for (const message of messages) {
            await this.handleMessages({ messages: [message] })
          }
        } else { // old already seen / handled messages
          // handle them however you want to
        }	 
      })
      
      return this.sock
    } catch (error) {
      console.error("Connection failed:", error)
    }
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update

    if (qr && ENV.PRINT_QR) {
      console.log(gradient.rainbow("\n📱 QR Code generated. Scan with WhatsApp:"))
      qrcode.generate(qr, { small: true })
      this.qrRetries++
      
      if (this.qrRetries >= this.maxQrRetries) {
        console.log("Max QR retries reached. Exiting...")
        process.exit(1)
      }
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode
      const statusCode = lastDisconnect?.error?.output?.statusCode || reason
      
      switch (statusCode) {
        case DisconnectReason.connectionClosed:
        case DisconnectReason.connectionLost:
        case 408: // Connection timed out
          console.log(chalk.red("[+] Connection timed out. restarting..."))
          if (this.connect) await this.connect()
          break

        case DisconnectReason.timedOut:
        case 503: // Unavailable service
          console.log(chalk.red("[+] Unavailable service. restarting..."))
          if (this.connect) await this.connect()
          break

        case DisconnectReason.restartRequired:
        case 428: // Connection closed
          console.log(chalk.cyan("[+] Connection closed, restarting..."))
          if (this.connect) await this.connect()
          break

        case 515: // Need to restart
          console.log(chalk.cyan("[+] Need to restart, restarting..."))
          if (this.connect) await this.connect()
          break

        case DisconnectReason.loggedOut:
        case 401: // Session Logged Out
          try {
            console.log(chalk.cyan("[+] Session Logged Out.. Recreate session..."))

            if (this.sessionPath) {
              fs.rmSync(this.sessionPath, {
                recursive: true,
                force: true,
              })
            }

            process.send("reset")
            console.log(chalk.green("[+] Session removed!!"))
          } catch (error) {
            console.log(chalk.cyan("[+] Session not found!!"))
          }
          break

        case DisconnectReason.badSession:
        case 403: // Banned
          console.log(chalk.red(`[+] Your WhatsApp Has Been Banned :D`))

          if (this.sessionPath) {
            fs.rmSync(this.sessionPath, { recursive: true, force: true })
          } else {
            fs.rmSync(".session", { recursive: true, force: true })
          }

          process.send("reset")
          break

        case DisconnectReason.multideviceMismatch:
        case 405: // Session Not Logged In
          try {
            console.log(chalk.cyan("[+] Session Not Logged In.. Recreate session..."))

            if (this.sessionPath) {
              fs.rmSync(this.sessionPath, { recursive: true, force: true })
            } else {
              fs.rmSync(".session", { recursive: true, force: true })
            }
            console.log(chalk.green("[+] Session removed!!"))
            process.send("reset")
          } catch (error) {
            console.log(chalk.cyan("[+] Session not found!!"))
          }
          break

        default:
      }
    } else if (connection === "open") {
      this.isConnected = true
      this.qrRetries = 0
      this.pairingCodeRequested = false
      console.log(gradient.morning("Bot connected successfully!"))
    }
  }

  async handleMessages(m) {
    try {
      const msg = m.messages?.[0]
      if (!msg || !msg.message) return

      if (this.botInstance) {
        // Gunakan remoteJid atau remoteJidAlt
        const chatId = msg.key.remoteJid || msg.key.remoteJidAlt
      }

      if (this.store?.groupMetadata && Object.keys(this.store.groupMetadata).length === 0) {
        try {
          this.store.groupMetadata = await this.sock.groupFetchAllParticipating()
        } catch (error) {
          console.warn("Failed to fetch group metadata:", error.message)
          this.store.groupMetadata = {}
        }
      }
      
      const { MessageHandler } = await import("../handlers/message.js")
      const handler = new MessageHandler(this.sock, this.store)

      await handler.handle(msg)
    } catch (error) {
      console.error("Error handling message:", error)
    }
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout()
      this.isConnected = false
      console.log("🔌 Bot disconnected")
    }
  }
}
