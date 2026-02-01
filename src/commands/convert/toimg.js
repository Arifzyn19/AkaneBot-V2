export default {
  name: "toimg",
  command: ["toimg", "toimage", "img"],
  description: "Convert sticker to image",
  category: "media",
  cooldown: 5,
  isQuoted: true,

  async execute(m, { sock }) {
    try {
      const quoted = m.quoted

      if (!quoted) {
        return await m.reply("❌ Please reply to a sticker!")
      }

      if (quoted.mtype !== "stickerMessage") {
        return await m.reply("❌ Please reply to a sticker only!")
      }

      await m.reply("🔄 Converting sticker to image...")

      try {
        const media = await quoted.download()

        await sock.sendMessage(
          m.chat,
          {
            image: media,
            caption: "✅ Sticker converted to image",
          },
          { quoted: m },
        )
      } catch (error) {
        console.error("Image conversion error:", error)
        await m.reply("❌ Failed to convert sticker to image.")
      }
    } catch (error) {
      console.error("ToImg command error:", error)
      await m.reply("❌ An error occurred while converting the sticker.")
    }
  },
}
