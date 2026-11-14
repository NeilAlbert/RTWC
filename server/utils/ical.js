function escapeICSText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldICalLine(line) {
  const folded = [];
  let current = '';
  let byteLength = 0;

  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (byteLength + characterBytes > 75) {
      folded.push(current);
      current = ` ${character}`;
      byteLength = 1 + characterBytes;
    } else {
      current += character;
      byteLength += characterBytes;
    }
  }

  folded.push(current);
  return folded.join('\r\n');
}

function formatICalDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('');
}

function formatICalDateTime(date) {
  return `${formatICalDate(date)}T${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}00Z`;
}

function getEventTimes(event) {
  const [year, month, day] = event.event_date.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const matches = [...String(event.event_time || '').matchAll(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi)];

  if (matches.length === 0) {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end, allDay: true };
  }

  const toMinutes = match => {
    const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
    return hour * 60 + Number(match[2] || 0);
  };
  const startMinutes = toMinutes(matches[0]);
  start.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60);

  const end = new Date(start);
  if (matches.length > 1) {
    const endMinutes = toMinutes(matches[1]);
    end.setUTCHours(Math.floor(endMinutes / 60), endMinutes % 60);
    if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
  } else {
    end.setUTCHours(end.getUTCHours() + 1);
  }

  return { start, end, allDay: false };
}

function createCalendarFeed(events, now = new Date()) {
  const timestamp = formatICalDateTime(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RTWC//Royal Temple Worship Centre Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Royal Temple Worship Centre Events'
  ];

  for (const event of events) {
    const { start, end, allDay } = getEventTimes(event);
    lines.push(
      'BEGIN:VEVENT',
      `UID:rtwc-event-${event.id}@royaltemple.org`,
      `DTSTAMP:${timestamp}`,
      ...(allDay
        ? [`DTSTART;VALUE=DATE:${formatICalDate(start)}`, `DTEND;VALUE=DATE:${formatICalDate(end)}`]
        : [`DTSTART:${formatICalDateTime(start)}`, `DTEND:${formatICalDateTime(end)}`]),
      `SUMMARY:${escapeICSText(event.title)}`,
      ...(event.description ? [`DESCRIPTION:${escapeICSText(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escapeICSText(event.location)}`] : []),
      ...(event.category ? [`CATEGORIES:${escapeICSText(event.category)}`] : []),
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldICalLine).join('\r\n')}\r\n`;
}

module.exports = { createCalendarFeed };
