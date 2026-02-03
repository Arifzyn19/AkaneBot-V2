export default {
  name: "sticker",
  command: ["sticker", "s", "stiker"],
  description: "Convert image/video to sticker",
  category: "convert",
  cooldown: 5,
  isQuoted: true,

  async execute(m, { sock, db }) {
    try {
      const quoted = m.isQuoted ? m.quoted : m

      const exif = {
        packName: "Create By",
        packPublish: db?.settings?.develover || "",
      }

      await m.react("⏳")
      
      if (/image|video|webp/i.test(quoted?.msg?.mimetype || "")) {
        if (quoted?.msg?.seconds && quoted.msg.seconds > 9) {
          return m.reply("❌ Max video 9 detik")
        }

        const buffer = await quoted.download()

        if (m.text) {
          const [packname, author] = m.text.split("|")
          exif.packName = packname?.trim() || ""
          exif.packPublish = author?.trim() || ""
        }

        return m.reply(buffer, { asSticker: true, ...exif })
      }
      
      if (m.mentions?.[0]) {
        const url = await sock.profilePictureUrl(m.mentions[0], "image")
        const buffer = await fetch(url).then(res => res.arrayBuffer())
        return m.reply(Buffer.from(buffer), { asSticker: true, ...exif })
      }
      
      if (/(https?:\/\/.*\.(png|jpg|jpeg|webp|mp4|webm|gif))/i.test(m.text || "")) {
        const url = m.text.match(/(https?:\/\/.*\.(png|jpg|jpeg|webp|mp4|webm|gif))/i)[0]
        const buffer = await fetch(url).then(res => res.arrayBuffer())
        return m.reply(Buffer.from(buffer), { asSticker: true, ...exif })
      }
      
      return m.reply(
        `Kirim / reply gambar atau video\n\nContoh:\n${m.prefix + m.command} wm1|wm2 (opsional)`
      )
    } catch (error) {
      console.error("Sticker command error:", error)
      return m.reply("❌ Gagal membuat sticker")
    }
  },
}