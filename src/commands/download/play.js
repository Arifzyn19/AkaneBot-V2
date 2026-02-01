export default {
  name: "play",
  command: ["play"],
  description: "Cari dan download lagu dari YouTube lalu kirim sebagai audio",
  category: "download",
  cooldown: 10,

  async execute(m, { sock, Api }) {
    try {
      const query = (m.text || "").trim()
      if (!query) {
        return m.reply(
          "❗ Format:\n.play <judul lagu>\n\nContoh:\n.play cupid\n.play noah separuh aku"
        )
      }

      await m.react("🔎")

      const res = await Api.neoxr("/play", { q: query })
      if (!res?.status || !res?.data?.url) {
        return m.reply("❌ Lagu tidak ditemukan.")
      }

      const {
        title,
        thumbnail,
        duration,
        views,
        data,
      } = res

      await m.reply(data.url, { mimetype: "audio/ogg; codecs=opus",
      ptt: false,
          fileName: data.filename || `${title}.mp3`, contextInfo: {
            externalAdReply: {
              title: title,
              body: "YouTube Audio Downloader",
              thumbnailUrl: thumbnail,
              mediaType: 1,
              renderLargerThumbnail: true,
            },
          },
          }
          )
          

      await m.react("✅")

    } catch (e) {
      console.error("play error:", e)
      await m.reply("❌ Terjadi kesalahan saat memproses lagu.")
    }
  },
}