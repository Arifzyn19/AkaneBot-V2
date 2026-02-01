export default {
  name: "sticker",
  command: ["sticker", "s", "stiker"],
  description: "Convert image/video to sticker",
  category: "media",
  cooldown: 5,
  isQuoted: true,

  async execute(m, { sock }) {
    try {
      const quoted = m.quoted

      if (!quoted) {
        return await m.reply("❌ Please reply to an image or video!")
      }

      const mediaType = quoted.mtype

      if (!["imageMessage", "videoMessage"].includes(mediaType)) {
        return await m.reply("❌ Please reply to an image or video only!")
      }

      await m.reply("🔄 Converting to sticker...")

      try {
        const media = await quoted.download()

        if (mediaType === "videoMessage") {
          // For video stickers (animated)
          await sock.sendMessage(
            m.chat,
            {
              sticker: media,
              mimetype: "image/webp",
            },
            { quoted: m },
          )
        } else {
          // For image stickers
          await sock.sendMessage(
            m.chat,
            {
              sticker: media,
              mimetype: "image/webp",
            },
            { quoted: m },
          )
        }
      } catch (error) {
        console.error("Sticker conversion error:", error)
        await m.reply("❌ Failed to convert media to sticker. Please try with a smaller file.")
      }
    } catch (error) {
      console.error("Sticker command error:", error)
      await m.reply("❌ An error occurred while processing the sticker.")
    }
  },
}
