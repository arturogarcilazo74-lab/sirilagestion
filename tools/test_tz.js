const fs = require('fs');

const dateString = "2026-09-03";
const date = new Date(dateString + 'T00:00:00');
console.log("Day of week:", date.getDay());

const start = new Date('2026-08-31T00:00:00');
const end = new Date('2026-11-27T00:00:00');
console.log("Within period:", date >= start && date <= end);

const dateWithoutT = new Date(dateString);
console.log("Without T:", dateWithoutT.toString(), dateWithoutT.getDay());
