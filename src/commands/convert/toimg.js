export default {
  name: "toimg",
  command: ["toimg", "toimage", "img"],
  description: "Convert sticker to image",
  category: "convert",
  cooldown: 5,
  isQuoted: true,

  async execute(m, { sock }) {
    try {
      const quoted = m.isQuoted ? m.quoted : m 

      if (!/webp/i.test(quoted?.msg?.mimetype)) {
        return m.reply(`Balas stiker dengan perintah ${m.prefix + m.command}`)
      }

      const { webp2mp4File } = await import("../../lib/exif.js")
      
      if (quoted.isAnimated) {
        const mp4 = await webp2mp4File(await quoted.download())
        return m.reply(mp4)
      }
      
      const buffer = await quoted.download()
      return m.reply(buffer, { mimetype: "image/jpeg" })

    } catch (error) {
      console.error("ToImg command error:", error)
      return m.reply("❌ Gagal mengkonversi stiker")
    }
  },
}