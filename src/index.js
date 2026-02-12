import { bot } from "./main.js"

async function startApplication() {
  try {
    await bot.start()

    console.log("✅ Application started successfully!")
  } catch (error) {
    console.error("❌ Fatal error:", error)
    process.exit(1)
  }
}

startApplication()
