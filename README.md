# 🎵 WhatsApp Music Bot V2 (Production Ready)

Welcome to a highly resilient, enterprise-grade WhatsApp Bot designed precisely to interface with **YouTube**, extract the absolute highest-quality audio using **yt-dlp**, and seamlessly send it back to users formatted dynamically. 

This project was built focusing on low memory footprints, auto-recoverability mechanisms, and clean Object-Oriented paradigms (Services/Controllers architecture) making it ideal for robust cloud deployments and advanced final-year projects (PFE).

---

## 🌟 Core Features

- **Interactive Song Selection:** Searching for `song <Name>` no longer guesses blindly. It natively returns an interactive dropdown menu of the **Top 5** results. Users reply with `1`, `2`, `3` to trigger their exact download. If they wait longer than 2 minutes, unselected sessions auto-expire cleanly to save server RAM!
- **Concurrency Queuing System:** The bot is guarded against traffic surges. If `10` people ask for a song concurrently, a custom TaskQueue processes up to `2` concurrent jobs safely. Other users are placed into a waitlist and receive real-time notifications about their waiting position!
- **VPS RAM Optimized (1GB Limits):**
  - **Node.js Configured limits:** V8 garbage collectors are locked down to `512MB` maximum memory size (`--max-old-space-size`).
  - **Puppeteer Headless Guards:** `whatsapp-web.js` explicitly disables Chromium's GPU scaling, shm-partitioning, and sandbox bloating, practically ensuring zero Out-Of-Memory (OOM) crashes on extremely low-end VPS machines.
- **Fail-Safe Auto Retries:** If `yt-dlp` mysteriously gets blocked or errors out during a stream chunking sequence, the `audioService` handles it by sleeping for two seconds and trying again (up to 3 times) before throwing a critical log.
- **Automatic Storage Cleanup:** Server disk space is meticulously protected. Exactly **10 minutes** after a user receives an MP3 file, the server will trigger an automated garbage collector that securely wipes the raw file from the `downloads/` directory!
- **Pristine Quality & Cover Art Embedded:** Audio is requested as `bestaudio` directly piped through `ffmpeg`, locking variable bitrate (`VBR`) bounds to `0` representing flawlessly preserved clarity (~320kbps). The YouTube thumbnail is actively burned inside the ID3 tag metadata of the actual MP3 alongside Artist names parsed dynamically, guaranteeing native WhatsApp Audio Player rendering.

---

## 🛠️ Step-by-Step Setup Instructions

Before running the application, make sure you have the following system integrations available (Required to run the audio encodings).

### 1. Install System Dependencies (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg python3
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 2. Install Node Packages
Navigate your shell directly into this repository where your `package.json` file lives.
```bash
npm install
```

### 3. Customize Constants
You can edit the `.env` file or `src/config/config.js` to change your scaling constants:
- `COMMAND_PREFIX`: Setup what triggers commands. (Default: `/`)
- `DEFAULT_QUALITY`: `320` or `128`
- `CONCURRENT_DOWNLOADS`: Number of `ffmpeg` threads allowed concurrently. (Default: 2)
- `MAX_RETRIES`: Timeout loop retries if connection gets throttled. (Default: 3)

---

## 🚀 How to Run the Bot

Start the server using exclusively the pre-configured npm task script:

```bash
npm start
```

1. Watch your console; a **QR Code** will instantly render.
2. Open your smartphone's WhatsApp App -> *Linked Devices* -> *Link a Device*.
3. Read the terminal screen QR code. 
4. And you are in!

> ⏱ The login session is actually saved inside `cache/auth/` directly afterwards so if you ever close the server terminal and restart it via `npm start`, it will immediately link back up into the background without requiring physical QR rescanning!

---

## 💬 WhatsApp Commands Syntax

Type these freely inside WhatsApp Chat groups or personal messages addressed at the bot's phone number! 

- `song <Name of Song>` - Example: `song Numb Linkin Park` (Prompts the top 5 selection interface.)
- `status` - Ask the bot perfectly what position queue number number you are currently holding if requests are locked up.
- `quality <128|320>` - Changes current user's default bit-streaming constraints.
- `help` - Prompts the menu commands safely again!

_Built securely using internal Node asynchronous principles._
