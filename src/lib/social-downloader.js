/*
 * Social Media downloader
 * need to install ytdp
 */
 
import { spawn, spawnSync } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PY_SCRIPT = path.resolve(__dirname, "../../scripts/social_downloader.py")

function resolvePythonBin() {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN
  const candidates = ["python3", "python"]
  for (const cmd of candidates) {
    try {
      const r = spawnSync(cmd, ["--version"], { stdio: "ignore" })
      if (r.status === 0) return cmd
    } catch {
      // ignore
    }
  }
  return "python3" // best effort
}

function runPython(args = []) {
  return new Promise((resolve, reject) => {
    const py = resolvePythonBin()
    const child = spawn(py, [PY_SCRIPT, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (d) => (stdout += d.toString()))
    child.stderr.on("data", (d) => (stderr += d.toString()))

    child.on("close", (code) => {
      // Clean up stdout - handle carriage returns and find JSON
      // Split by both \n and \r, then filter empty lines
      const cleanOutput = stdout.replace(/\r/g, '\n').split('\n').filter(line => line.trim())
      let jsonLine = ""
      
      // Find the line that looks like JSON (starts with { or [)
      for (const line of cleanOutput) {
        const trimmed = line.trim()
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          jsonLine = trimmed
          break
        }
      }
      
      // If no JSON found, try the last non-empty line
      if (!jsonLine && cleanOutput.length > 0) {
        const lastLine = cleanOutput[cleanOutput.length - 1].trim()
        if (lastLine.startsWith('{') || lastLine.startsWith('[')) {
          jsonLine = lastLine
        }
      }
      
      // If still no content but we have stderr, that's an error
      if (!jsonLine && stderr.trim()) {
        return reject(new Error(`Downloader failed: ${stderr.trim()}`))
      }
      
      // If no JSON content at all
      if (!jsonLine) {
        return reject(new Error(`No JSON output received. Stdout: ${stdout}, Stderr: ${stderr}`))
      }
      
      try {
        const json = JSON.parse(jsonLine)
        if (json.status === "ok") return resolve(json)
        const err = new Error(json.message || "Downloader returned error")
        err.details = json
        return reject(err)
      } catch (parseError) {
        const err = new Error(`Invalid JSON output: ${jsonLine}. Parse error: ${parseError.message}`)
        err.stdout = stdout
        err.stderr = stderr
        return reject(err)
      }
    })
    
    child.on("error", (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`))
    })
  })
}

// Public API

export async function searchYouTube(query, limit = 5) {
  return runPython(["search", "--query", String(query), "--limit", String(limit)])
}

/**
 * .play style: search then download best audio
 * options: { index?: number, audioFormat?: 'mp3'|'m4a', output?: string }
 */
export async function play(query, options = {}) {
  const args = ["play", "--query", String(query)]
  if (options.index) args.push("--index", String(options.index))
  if (options.audioFormat) args.push("--audio-format", options.audioFormat)
  if (options.output) args.push("--output", options.output)
  return runPython(args)
}

/**
 * Download a single URL (YouTube/TikTok/Instagram/Facebook)
 * options: { kind?: 'audio'|'video', audioFormat?: 'mp3'|'m4a', videoFormat?: 'mp4', output?: string }
 */
export async function download(url, options = {}) {
  const args = ["download", "--url", String(url)]
  if (options.kind) args.push("--kind", options.kind)
  if (options.audioFormat) args.push("--audio-format", options.audioFormat)
  if (options.videoFormat) args.push("--video-format", options.videoFormat)
  if (options.output) args.push("--output", options.output)
  return runPython(args)
}

// Example usage (remove or comment out in production):
// (async () => {
//   console.log("[v0] search demo");
//   console.log(await searchYouTube("lofi hip hop", 3));
//   console.log("[v0] play demo");
//   console.log(await play("Rick Astley Never Gonna Give You Up", { index: 1, audioFormat: "mp3", output: "downloads" }));
//   console.log("[v0] download demo");
//   console.log(await download("https://www.tiktok.com/@scout2015/video/6718335390845095173", { kind: "video", output: "downloads" }));
// })();