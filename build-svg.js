import fs from "node:fs/promises";

const PROFILE = {
  firstName: "Austin",
  city: "Calgary",
  timezone: "America/Edmonton",
  latitude: 51.0447,
  longitude: -114.0719,
  website: "pqt.dev",
  linkedin: "linkedin.com/in/pqt",
};

const WEATHER_CODES = {
  0: "clear",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "foggy",
  51: "drizzly",
  53: "drizzly",
  55: "drizzly",
  56: "freezing drizzle",
  57: "freezing drizzle",
  61: "rainy",
  63: "rainy",
  65: "rainy",
  66: "freezing rain",
  67: "freezing rain",
  71: "snowy",
  73: "snowy",
  75: "snowy",
  77: "snowy",
  80: "showery",
  81: "showery",
  82: "showery",
  85: "snowy",
  86: "snowy",
  95: "stormy",
  96: "stormy",
  99: "stormy",
};

const SVG_WIDTH = 760;
const LEFT = 18;
const TOP = 14;
const MAX_BUBBLE_WIDTH = 690;
const FONT_SIZE = 20;
const LINE_HEIGHT = 28;
const PADDING_X = 18;
const PADDING_TOP = 14;
const PADDING_BOTTOM = 15;
const GAP = 14;
const TYPING_WIDTH = 76;
const TYPING_HEIGHT = 42;
const AVG_CHAR_WIDTH = 10.2;
const MAX_CHARS_PER_LINE = 64;

async function main() {
  const now = new Date();
  const weather = await getWeather();
  const messages = buildMessages(now, weather);
  const svg = renderSvg(messages);

  await fs.writeFile("chat.svg", svg);
  console.log("Wrote chat.svg");
}

function buildMessages(now, weather) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: PROFILE.timezone,
    weekday: "long",
  }).format(now);

  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: PROFILE.timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  const weatherMessage = weather
    ? `${PROFILE.city} check-in: ${weather.tempC} C / ${weather.tempF} F and ${weather.description}.`
    : `${PROFILE.city} check-in: local weather is taking a short break.`;

  return [
    `Hi, I'm ${PROFILE.firstName}.`,
    `I'm a ${PROFILE.city}-based principal frontend and product engineer.`,
    "I build product interfaces, design systems, developer tools, and applied AI workflows.",
    weatherMessage,
    `It is ${weekday} around ${time} here, so the README gets a fresh little pulse.`,
    `Website: ${PROFILE.website} | LinkedIn: ${PROFILE.linkedin}`,
  ];
}

async function getWeather() {
  const params = new URLSearchParams({
    latitude: PROFILE.latitude.toString(),
    longitude: PROFILE.longitude.toString(),
    current: "temperature_2m,weather_code",
    temperature_unit: "celsius",
    timezone: PROFILE.timezone,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo responded with ${response.status}`);
    }

    const json = await response.json();
    const current = json.current;

    if (
      typeof current?.temperature_2m !== "number" ||
      typeof current?.weather_code !== "number"
    ) {
      throw new Error("Open-Meteo response did not include current conditions");
    }

    const tempC = Math.round(current.temperature_2m);
    const tempF = Math.round((tempC * 9) / 5 + 32);
    const description = WEATHER_CODES[current.weather_code] ?? "weather-like";

    return { tempC, tempF, description };
  } catch (error) {
    console.warn(`Weather unavailable: ${error.message}`);
    return null;
  }
}

function renderSvg(messages) {
  const bubbles = messages.map((message, index) => {
    const lines = wrapText(message);
    const textWidth = Math.max(...lines.map((line) => estimateTextWidth(line)));
    const width = clamp(
      Math.ceil(textWidth + PADDING_X * 2),
      TYPING_WIDTH,
      MAX_BUBBLE_WIDTH,
    );
    const height =
      PADDING_TOP + PADDING_BOTTOM + lines.length * LINE_HEIGHT - 6;

    return { index, lines, width, height };
  });

  let y = TOP;
  const renderedBubbles = [];
  const animations = [];

  for (const bubble of bubbles) {
    const number = bubble.index + 1;
    const typingDelay = bubble.index * 1.85;
    const typingDuration = 1.2;
    const messageDelay = typingDelay + typingDuration;

    animations.push(`
        .typing-${number} {
          animation: typing ${formatSeconds(typingDuration)} ${formatSeconds(
            typingDelay,
          )} linear both;
        }

        .msg-${number} {
          animation: show 0.22s ${formatSeconds(messageDelay)} ease-out both;
        }`);

    renderedBubbles.push(renderTypingIndicator(number, y));
    renderedBubbles.push(renderBubble(number, bubble, y));

    y += bubble.height + GAP;
  }

  const height = y + TOP - GAP;

  return `<svg width="${SVG_WIDTH}" height="${height}" viewBox="0 0 ${SVG_WIDTH} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">Austin Paquette profile chat</title>
  <desc id="desc">An animated chat-style introduction for Austin Paquette.</desc>
  <style>
    .bubble {
      fill: #e9e9eb;
    }

    .dot {
      fill: #8e8e93;
    }

    text {
      fill: #242424;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${FONT_SIZE}px;
      letter-spacing: 0;
    }

    .dot-1 {
      animation: dot 1s 0s infinite ease-in-out;
    }

    .dot-2 {
      animation: dot 1s 0.16s infinite ease-in-out;
    }

    .dot-3 {
      animation: dot 1s 0.32s infinite ease-in-out;
    }

    @keyframes typing {
      0%, 100% {
        opacity: 0;
      }

      12%, 88% {
        opacity: 1;
      }
    }

    @keyframes show {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    @keyframes dot {
      0%, 100% {
        opacity: 0.45;
      }

      50% {
        opacity: 1;
      }
    }

    ${animations.join("\n")}

    @media (prefers-color-scheme: dark) {
      .bubble {
        fill: #3b3b3d;
      }

      .dot {
        fill: #a6a6aa;
      }

      text {
        fill: #f2f2f2;
      }
    }
  </style>
  ${renderedBubbles.join("\n")}
</svg>
`;
}

function renderTypingIndicator(number, y) {
  return `<g class="typing typing-${number}" transform="translate(${LEFT} ${y})">
    <rect class="bubble" width="${TYPING_WIDTH}" height="${TYPING_HEIGHT}" rx="21" />
    <circle class="dot dot-1" cx="29" cy="21" r="5" />
    <circle class="dot dot-2" cx="43" cy="21" r="5" />
    <circle class="dot dot-3" cx="57" cy="21" r="5" />
  </g>`;
}

function renderBubble(number, bubble, y) {
  const text = bubble.lines
    .map((line, index) => {
      const textY = PADDING_TOP + FONT_SIZE + index * LINE_HEIGHT;
      return `<text x="${PADDING_X}" y="${textY}">${escapeXml(line)}</text>`;
    })
    .join("\n    ");

  return `<g class="message msg-${number}" transform="translate(${LEFT} ${y})">
    <rect class="bubble" width="${bubble.width}" height="${bubble.height}" rx="21" />
    ${text}
  </g>`;
}

function wrapText(text) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= MAX_CHARS_PER_LINE) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function estimateTextWidth(text) {
  return text.length * AVG_CHAR_WIDTH;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatSeconds(value) {
  return `${Number(value.toFixed(2))}s`;
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main();
