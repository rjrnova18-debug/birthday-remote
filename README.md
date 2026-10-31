# Birthday Remote

A birthday gift for a friend who lives in another country: an ESP32 on my desk that a web page can trigger from anywhere in the world. The friend opens a link, a letter comes out of an envelope and unfolds into a birthday party, and a countdown activates the circuit here at home.

> 🚧 **Work in progress.** Stage 2 of 5 is done: the web page is finished and toggles the ESP32's LED in real time. Next: the "Happy Birthday" melody on a buzzer, LED sequences and an LCD.

## How it works

The ESP32 sits behind a home router (NAT), so nobody outside can connect to it directly. Instead, **both sides connect outwards** to a public MQTT broker, which relays the messages between them (publish/subscribe):

```
 Web page (GitHub Pages)            MQTT broker (HiveMQ)             ESP32 at home
 ┌───────────────────┐  publishes   ┌──────────────────┐  delivers   ┌──────────────────┐
 │ countdown card    │ ───────────► │ <key>/led        │ ──────────► │ subscribed       │
 │ shows real state  │ ◄─────────── │ <key>/state      │ ◄────────── │ publishes state  │
 └───────────────────┘  subscribes  │ <key>/status     │  publishes  └──────────────────┘
   friend abroad                    └──────────────────┘   (Last Will)
```

| Topic | Who publishes | Payload | Retained |
|---|---|---|---|
| `<key>/led` | Web page | `ON` / `OFF` (command) | No |
| `<key>/state` | ESP32 | `ON` / `OFF` (what the LED really is) | Yes |
| `<key>/status` | ESP32 (and the broker, via *Last Will*) | `online` / `offline` | Yes |

The page **never assumes** a command worked: it sends `ON`, shows "Activando…", and only says "¡Circuito activado!" when the ESP32 publishes the `OFF → ON` change on `/state`. If no answer arrives within 5 s, it offers to retry.

## Features

**Web page** (`docs/`, plain HTML + CSS + JavaScript modules)
- An envelope that opens: the wax seal breaks, the flap swings up in 3D and the folded letter slides out.
- The letter unfolds in 3D (right half, then bottom half) and grows until its paper becomes the background of the party.
- Celebration: greetings in English, Spanish and German, a two-tier cake with an animated sparkler, confetti ([canvas-confetti](https://github.com/catdad/canvas-confetti)), balloons and GIF stickers.
- A countdown card (5 → 0) that activates the circuit and waits for the ESP32 to confirm. It can be closed and reopened, and closing it mid-countdown cancels it.
- Live device status: the button reads "Conectando…" or "Circuito dormido" when the page or the ESP32 is offline.
- Works on phones, can be used with the keyboard, and respects the system's *reduce motion* setting.

**Firmware** (`firmware/`, PlatformIO + Arduino framework)
- WiFi in station mode and MQTT with [PubSubClient](https://github.com/knolleary/pubsubclient).
- Publishes the LED state as a retained message, so the page knows it as soon as it loads.
- MQTT *Last Will*: if the ESP32 drops off, the broker announces `offline` on its behalf.

## Running it

### Firmware

1. Install [PlatformIO](https://platformio.org/) (VS Code extension).
2. Copy `firmware/include/secrets.example.h` to `firmware/include/secrets.h` and fill in your WiFi and a **unique, hard-to-guess topic key** (it replaces `your-unique-topic`). `secrets.h` is ignored by git.
3. Connect an ESP32 DOIT DevKit V1 and run **Upload** (or `pio run -t upload` inside `firmware/`).
4. Open the serial monitor (115200 baud) to see the connection and the incoming commands.

### Web page

The topic key and the friend's name travel **in the link**, never in the code, because the repository is public:

```
https://rjrnova18-debug.github.io/birthday-remote/?t=<topic-key>&n=<name>
```

To try it locally, the page needs a web server (JavaScript modules do not load from `file://`):

```bash
cd docs
python -m http.server 8000
# open http://localhost:8000/?t=<topic-key>&n=Test
```

Handy while developing: `&s=celebration` skips the envelope, and `&s=card` opens the countdown card straight away.

Texts, GIF URLs and timings live in the `CONFIG` object at the top of `docs/app.js`.

## Project structure

```
birthday-remote/
├── docs/                    ← web page, published with GitHub Pages
│   ├── index.html           ← markup of both scenes (envelope, celebration + card)
│   ├── style.css            ← palette, layout and every CSS animation
│   ├── app.js               ← page state, render() and the scene timeline (async/await)
│   ├── device.js            ← everything MQTT: connects, remembers what the ESP32 said
│   ├── envelope.js          ← envelope scene: stars and opening animation
│   ├── unfold.js            ← 3D unfolding letter (Web Animations API)
│   └── celebration.js       ← celebration entrance and confetti
└── firmware/                ← ESP32 (PlatformIO)
    ├── platformio.ini
    ├── include/
    │   └── secrets.example.h  ← template; the real secrets.h is git-ignored
    └── src/main.cpp
```

`device.js` knows nothing about the page and `app.js` knows nothing about MQTT: the two only talk through `onChange`, `sendOn` and `sendOff`.

## Roadmap

- [x] **Stage 1:** toggle an LED from another country (WiFi + MQTT + a simple page).
- [x] **Stage 2:** final web page with real-time state, online/offline status and the full animation.
- [ ] **Stage 3:** "Happy Birthday" on a passive buzzer, without blocking the loop, synced with LEDs.
- [ ] **Stage 4:** LCD message and an optional physical button.
- [ ] **Stage 5:** private broker with credentials, demo video.

## What I learned

- **Why a device at home is unreachable from outside** (private IP, NAT, CGNAT), and how publish/subscribe solves it: both sides connect *out* to a broker.
- **MQTT in practice:** topics, retained messages, *Last Will*, and keepalive (detecting a dead device always means waiting for a timeout).
- **Confirm instead of assume:** the UI shows what the device *reports*, and detects success as a rising edge (`OFF → ON`), not a level.
- **One source of truth:** `setLed()` in C++ and `render()` in JavaScript are the only places that change the LED and the screen.
- **Separating logic from presentation:** an MQTT module with a tiny interface and callbacks, so the dependency points one way.
- **State machines:** scenes (`envelope → celebration`) and the card (`idle → counting → waiting → done | error`).
- **Secrets out of the code:** credentials in a git-ignored header, the topic key in the link.
- **Animation:** CSS keyframes, 3D transforms (`perspective`, `preserve-3d`, `backface-visibility`), and the Web Animations API to write a timeline with `await`.
- **Git habits:** reviewing `git diff` / `git diff --staged` before every commit, Conventional Commits, one commit per step.

## Possible improvements

- A private broker with username and password (the public HiveMQ broker is fine for a demo, not for anything sensitive).
- Host the GIFs in the repo instead of linking to Tenor, so the page does not depend on external URLs.
- Automated tests for the page logic (the card's state machine) and for the firmware's message handling.
