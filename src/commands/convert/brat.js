export default {
  name: "brat",
  command: ["brat"],
  description: "Generate brat image or video",
  category: "convert",
  cooldown: 5,

  async execute(m, { Api }) {
    try {
      if (!m.text) {
        return m.reply(`Contoh:\n${m.prefix + m.command} ayo scroll fesnuk 😜\n\nVideo:\n${m.prefix + m.command} --vid ayo scroll fesnuk 😜`)
      }

      // detect mode
      const isVideo = /--vid|--video/i.test(m.text)
      const text = m.text.replace(/--vid|--video/i, "").trim()

      if (!text) return m.reply("Teksnya mana?")

      await m.react("⏳")

      const endpoint = isVideo ? "/bratvid" : "/brat"
      const json = await Api.neoxr(endpoint, { text })

      if (!json?.status || !json?.data?.url) {
        return m.reply("❌ Gagal generate brat")
      }

      const buffer = await fetch(json.data.url).then(res => res.arrayBuffer())

      if (isVideo) {
        return m.reply(Buffer.from(buffer), {
          asSticker: true,
        })
      }

      return m.reply(Buffer.from(buffer), {
        asSticker: true,
      })

    } catch (err) {
      console.error("Brat command error:", err)
      return m.reply("❌ Error saat membuat brat")
    }
  },
}