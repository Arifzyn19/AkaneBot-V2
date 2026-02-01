#!/usr/bin/env python3
"""
Social Downloader CLI using yt-dlp.

Features:
- YouTube audio (MP3/M4A) and video (MP4) downloads
- TikTok, Instagram, Facebook video downloads (prefer MP4)
- YouTube search and .play command (search + download best audio)
- JSON output for easy JS integration

Dependencies:
- Python 3.9+, yt-dlp (auto-install attempted), ffmpeg (optional but recommended for MP3/MP4 remux)
- Can be invoked from Node via child_process; override Python binary with env PYTHON_BIN if needed.

Commands:
- search --query "your keywords" [--limit 5]
- play --query "song name" [--index 1] [--audio-format mp3|m4a] [--output downloads]
- download --url <url> [--kind audio|video] [--audio-format mp3|m4a] [--video-format mp4] [--output downloads]
"""

import argparse
import json
import os
import re
import shutil
import sys
import subprocess
from typing import Dict, Any, List, Optional

def _json_print(payload: Dict[str, Any], exit_code: int = 0) -> None:
    print(json.dumps(payload, ensure_ascii=False))
    sys.exit(exit_code)

def ensure_yt_dlp():
    try:
        import yt_dlp  # noqa: F401
        return
    except Exception:
        try:
            # Try to install yt-dlp for the current Python (user site)
            subprocess.check_call = subprocess.check_call  # alias for shorter line
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "yt-dlp"])
            import yt_dlp  # noqa: F401
            return
        except Exception:
            # Fallback: try global install without --user (may still fail in restricted envs)
            try:
                subprocess.check_call([sys.executable, "-m", "pip", "install", "yt-dlp"])
                import yt_dlp  # noqa: F401
                return
            except Exception as e2:
                _json_print({
                    "status": "error",
                    "message": "yt-dlp is not installed and automatic installation failed. Please install: pip install yt-dlp",
                    "error": str(e2),
                }, exit_code=1)

def has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None

def detect_platform(url: str) -> str:
    u = url.lower()
    if "youtube.com" in u or "youtu.be" in u:
        return "youtube"
    if "tiktok.com" in u:
        return "tiktok"
    if "instagram.com" in u:
        return "instagram"
    if "facebook.com" in u or "fb.watch" in u:
        return "facebook"
    return "unknown"

def yt_search(query: str, limit: int = 5) -> Dict[str, Any]:
    from yt_dlp import YoutubeDL
    opts = {
        "quiet": True,
        "skip_download": True,
        "noplaylist": True,
        "default_search": "ytsearch",
        "extract_flat": False,
    }
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
        entries = info.get("entries") or []
        results: List[Dict[str, Any]] = []
        for i, e in enumerate(entries, start=1):
            if not e:
                continue
            results.append({
                "index": i,
                "id": e.get("id"),
                "title": e.get("title"),
                "duration": e.get("duration"),
                "webpage_url": e.get("webpage_url"),
                "uploader": e.get("uploader"),
                "channel": e.get("channel"),
                "thumbnails": e.get("thumbnails"),
            })
        return {"status": "ok", "action": "search", "query": query, "results": results}

def _resolve_filepath_after_download(ydl, info: Dict[str, Any], preferred_ext: Optional[str] = None) -> str:
    # Newer yt-dlp returns 'requested_downloads' with 'filepath'
    req = info.get("requested_downloads")
    if isinstance(req, list) and req:
        for d in req:
            fp = d.get("filepath")
            if fp:
                return fp

    # Fallback to prepared filename
    try:
        base = ydl.prepare_filename(info)
    except Exception:
        base = info.get("_filename") or ""

    if preferred_ext and base:
        root, _ = os.path.splitext(base)
        return f"{root}.{preferred_ext}"
    return base

def build_output_template(output_dir: str) -> str:
    return os.path.join(output_dir, "%(title)s [%(id)s].%(ext)s")

def check_video_availability(url: str) -> Dict[str, Any]:
    """Check if video has downloadable formats before attempting download"""
    from yt_dlp import YoutubeDL
    
    opts = {
        "quiet": True,
        "skip_download": True,
        "no_warnings": True,  # Suppress warnings to stderr
    }
    
    try:
        with YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            formats = info.get("formats", [])
            
            # Filter out image formats (storyboard)
            video_audio_formats = [f for f in formats if f.get("vcodec") != "images" and f.get("acodec") != "images"]
            
            return {
                "available": len(video_audio_formats) > 0,
                "formats": video_audio_formats,
                "title": info.get("title"),
                "duration": info.get("duration"),
                "total_formats": len(formats),
                "usable_formats": len(video_audio_formats)
            }
    except Exception as e:
        return {
            "available": False,
            "error": str(e),
            "formats": [],
            "total_formats": 0,
            "usable_formats": 0
        }

def download_media(url: str, kind: str, output_dir: str, audio_format: str = "mp3", video_format: str = "mp4") -> Dict[str, Any]:
    from yt_dlp import YoutubeDL

    os.makedirs(output_dir, exist_ok=True)
    platform = detect_platform(url)
    ffmpeg_ok = has_ffmpeg()

    # First, check if video has downloadable content
    availability = check_video_availability(url)
    if not availability["available"]:
        error_msg = f"Video tidak memiliki format yang bisa didownload. "
        if availability.get("error"):
            error_msg += f"Error: {availability['error']}"
        else:
            error_msg += f"Hanya ditemukan {availability['total_formats']} format gambar (storyboard), tidak ada audio/video."
        
        return {
            "status": "error",
            "message": error_msg,
            "details": availability
        }

    ydl_opts: Dict[str, Any] = {
        "outtmpl": build_output_template(output_dir),
        "noplaylist": True,
        "quiet": True,  # Suppress progress output to stdout
        "no_warnings": True,  # Suppress warnings to stderr
        "noprogress": True,  # Disable progress output completely
        "postprocessor_hooks": [],
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
    }

    # Only set merge_output_format if ffmpeg is available
    if ffmpeg_ok:
        ydl_opts["merge_output_format"] = "mp4"

    note = None

    if kind == "audio":
        # More flexible audio format selection with multiple fallbacks
        if platform == "youtube":
            # For YouTube, be very flexible with audio formats
            ydl_opts["format"] = (
                "bestaudio[ext=m4a]/"
                "bestaudio[ext=webm]/"
                "bestaudio[ext=mp4]/"
                "bestaudio/"
                "best[abr>0]/"  # Any format with audio bitrate
                "best"
            )
        else:
            ydl_opts["format"] = "bestaudio/best"
        
        if ffmpeg_ok and audio_format == "mp3":
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }]
            preferred_ext = "mp3"
        elif ffmpeg_ok:
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "m4a",
                "preferredquality": "192",
            }]
            preferred_ext = "m4a"
        else:
            if audio_format == "mp3":
                note = "ffmpeg not found, downloading best available audio format"
            preferred_ext = None
            
    else:
        # kind == "video" - more flexible video format selection
        if platform == "youtube":
            ydl_opts["format"] = (
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/"
                "bestvideo[ext=webm]+bestaudio[ext=webm]/"
                "bestvideo+bestaudio/"
                "best[ext=mp4]/"
                "best[ext=webm]/"
                "best"
            )
        else:
            ydl_opts["format"] = "best[ext=mp4]/best"
        
        if ffmpeg_ok and video_format == "mp4":
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "FFmpegVideoRemuxer",
                "preferedformat": "mp4",
            })
            preferred_ext = "mp4"
        else:
            preferred_ext = None

    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            # Check if we actually downloaded something
            requested_downloads = info.get("requested_downloads", [])
            if not requested_downloads:
                return {
                    "status": "error",
                    "message": "Download berhasil diproses tapi tidak ada file yang didownload",
                    "title": info.get("title"),
                    "available_formats": len(info.get("formats", []))
                }
            
            filepath = _resolve_filepath_after_download(ydl, info, preferred_ext=preferred_ext)
            return {
                "status": "ok",
                "action": "download",
                "platform": platform,
                "kind": kind,
                "title": info.get("title"),
                "id": info.get("id"),
                "duration": info.get("duration"),
                "ext": os.path.splitext(filepath)[1].lstrip(".") if filepath else None,
                "filepath": filepath,
                "note": note,
                "webpage_url": info.get("webpage_url") or url,
            }
            
    except Exception as e:
        error_str = str(e)
        
        # More specific error handling
        if "only images are available" in error_str.lower():
            return {
                "status": "error",
                "message": "Video ini hanya menyediakan gambar preview, tidak ada audio/video yang bisa didownload",
                "error": error_str
            }
        elif "private video" in error_str.lower():
            return {
                "status": "error", 
                "message": "Video ini bersifat private dan tidak bisa didownload",
                "error": error_str
            }
        elif "unavailable" in error_str.lower():
            return {
                "status": "error",
                "message": "Video tidak tersedia (mungkin sudah dihapus atau diblokir di region ini)",
                "error": error_str
            }
        else:
            # Try one more time with most basic settings
            try:
                basic_opts = {
                    "outtmpl": build_output_template(output_dir),
                    "quiet": True,
                    "format": "worst",  # Try worst quality as last resort
                }
                
                with YoutubeDL(basic_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    filepath = _resolve_filepath_after_download(ydl, info)
                    return {
                        "status": "ok",
                        "action": "download",
                        "platform": platform,
                        "kind": kind,
                        "title": info.get("title"),
                        "id": info.get("id"),
                        "duration": info.get("duration"),
                        "ext": os.path.splitext(filepath)[1].lstrip(".") if filepath else None,
                        "filepath": filepath,
                        "note": f"Used worst quality fallback. Original error: {error_str}",
                        "webpage_url": info.get("webpage_url") or url,
                    }
            except Exception:
                return {
                    "status": "error",
                    "message": "Download gagal bahkan dengan pengaturan paling basic",
                    "error": error_str
                }

def play_audio(query: str, index: int, output_dir: str, audio_format: str = "mp3") -> Dict[str, Any]:
    # Search first
    s = yt_search(query, limit=max(10, index))  # Get more results in case some fail
    results = s.get("results", [])
    if not results:
        return {"status": "error", "action": "play", "message": "No results found", "query": query}
    
    # Try multiple videos if the first one fails
    attempts = []
    for attempt in range(min(3, len(results))):  # Try up to 3 videos
        i = max(1, min(index + attempt, len(results))) - 1
        chosen = results[i]
        url = chosen["webpage_url"]
        
        attempts.append({
            "index": i + 1,
            "title": chosen["title"],
            "url": url
        })
        
        try:
            meta = download_media(url, kind="audio", output_dir=output_dir, audio_format=audio_format)
            if meta.get("status") == "ok":
                meta["search"] = {
                    "query": query, 
                    "requested_index": index,
                    "actual_index": i + 1,
                    "chosen_title": chosen["title"],
                    "attempts": attempts
                }
                meta["action"] = "play"
                return meta
        except Exception as e:
            attempts[-1]["error"] = str(e)
            continue
    
    # If all attempts failed
    return {
        "status": "error", 
        "action": "play", 
        "message": f"Gagal mendownload audio dari {len(attempts)} video yang dicoba",
        "query": query,
        "attempts": attempts
    }

def main():
    ensure_yt_dlp()
    parser = argparse.ArgumentParser(prog="social_downloader", description="Download media from YouTube/TikTok/Instagram/Facebook using yt-dlp")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_search = sub.add_parser("search", help="Search YouTube")
    p_search.add_argument("--query", required=True, help="Search query")
    p_search.add_argument("--limit", type=int, default=5, help="Number of results")

    p_play = sub.add_parser("play", help="Search and download best audio")
    p_play.add_argument("--query", required=True, help="Song query")
    p_play.add_argument("--index", type=int, default=1, help="Pick Nth result (1-based)")
    p_play.add_argument("--audio-format", choices=["mp3", "m4a"], default="mp3")
    p_play.add_argument("--output", default="downloads", help="Output directory")

    p_dl = sub.add_parser("download", help="Download URL")
    p_dl.add_argument("--url", required=True, help="Media URL")
    p_dl.add_argument("--kind", choices=["audio", "video"], help="audio for songs, video for clips")
    p_dl.add_argument("--audio-format", choices=["mp3", "m4a"], default="mp3")
    p_dl.add_argument("--video-format", choices=["mp4"], default="mp4")
    p_dl.add_argument("--output", default="downloads", help="Output directory")

    args = parser.parse_args()

    try:
        if args.cmd == "search":
            res = yt_search(args.query, limit=args.limit)
            _json_print(res)

        elif args.cmd == "play":
            res = play_audio(args.query, index=args.index, output_dir=args.output, audio_format=args.audio_format)
            code = 0 if res.get("status") == "ok" else 1
            _json_print(res, exit_code=code)

        elif args.cmd == "download":
            kind = args.kind
            if not kind:
                # default: audio for YouTube links, video otherwise
                kind = "audio" if detect_platform(args.url) == "youtube" else "video"
            res = download_media(
                url=args.url,
                kind=kind,
                output_dir=args.output,
                audio_format=args.audio_format,
                video_format=args.video_format,
            )
            code = 0 if res.get("status") == "ok" else 1
            _json_print(res, exit_code=code)

    except SystemExit:
        raise
    except Exception as e:
        _json_print({
            "status": "error",
            "message": "Unexpected error",
            "error": str(e),
        }, exit_code=1)

if __name__ == "__main__":
    main()