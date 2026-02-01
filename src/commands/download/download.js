import { fileTypeFromBuffer } from "file-type"

export default {
  name: "download",
  command: ["download", "dl"],
  description: "Download media from WhatsApp message",
  category: "media",
  cooldown: 10,
  isQuoted: true,

  async execute(m, { sock }) {
    try {
      const quoted = m.quoted

      if (!quoted) {
        return await m.reply("❌ Please reply to a media message!")
      }

      const mediaTypes = ["imageMessage", "videoMessage", "audioMessage", "documentMessage"]

      if (!mediaTypes.includes(quoted.mtype)) {
        return await m.reply("❌ Please reply to an image, video, audio, or document!")
      }

      await m.reply("📥 Downloading media...")

      try {
        const media = await quoted.download()
        const fileType = await fileTypeFromBuffer(media)

        let caption = "📁 Downloaded Media\n"
        caption += `📊 Size: ${(media.length / 1024 / 1024).toFixed(2)} MB\n`

        if (fileType) {
          caption += `🏷️ Type: ${fileType.mime}\n`
          caption += `📝 Extension: .${fileType.ext}`
        }

        // Send back the media with info
        switch (quoted.mtype) {
          case "imageMessage":
            await sock.sendMessage(
              m.chat,
              {
                image: media,
                caption: caption,
              },
              { quoted: m },
            )
            break

          case "videoMessage":
            await sock.sendMessage(
              m.chat,
              {
                video: media,
                caption: caption,
              },
              { quoted: m },
            )
            break

          case "audioMessage":
            await sock.sendMessage(
              m.chat,
              {
                audio: media,
                mimetype: "audio/mpeg",
                caption: caption,
              },
              { quoted: m },
            )
            break

          case "documentMessage":
            await sock.sendMessage(
              m.chat,
              {
                document: media,
                mimetype: quoted.msg.mimetype || "application/octet-stream",
                fileName: quoted.msg.fileName || "downloaded_file",
                caption: caption,
              },
              { quoted: m },
            )
            break
        }
      } catch (error) {
        console.error("Download error:", error)
        await m.reply("❌ Failed to download media. File might be too large or corrupted.")
      }
    } catch (error) {
      console.error("Download command error:", error)
      await m.reply("❌ An error occurred while downloading the media.")
    }
  },
}
