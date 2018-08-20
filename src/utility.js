const million = 1000000;

/**
 * Tranform icodrops money format to millions
 * @param {string} string Icodrops money format string
 *                             for example:$3,274,277
 * @return {string} Number of millions.
 */
function getMillion(string) {
  // erase '$' and ','
  string = string.replace('$', '');
  string = string.split(',').join('');

  let money = Number(string);
  money = money / million;
  return money.toFixed(2);
}

/**
 * Get domain name from given url
 * @param {string} url
 * @return {string} Domain name.
 */
function getDomainName(url) {
  return url.split('/')[2];
}

/**
 * Calculate date based on how many days left.
 * @param {number} daysLeft How many days left.
 * @return {date} Calculated date.
 */
function getDateByDayLeft(daysLeft) {
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + daysLeft);
  return getFormatDate(currentDate);
}

/**
 * Transform date that has string month (ex: Jan) to js Date
 * @param {number} year Input year.
 * @param {string} monthString Input month (in string format).
 * @param {number} date Input date.
 * @return {date} js Date of given input.
 */
function getDateFromStrMonth(year, monthString, date) {
  let month;
  if (monthString === 'JANUARY') month = 1;
  else if (monthString === 'FEBRUARY') month = 2;
  else if (monthString === 'MARCH') month = 3;
  else if (monthString === 'APRIL') month = 4;
  else if (monthString === 'MAY') month = 5;
  else if (monthString === 'JUNE') month = 6;
  else if (monthString === 'JULY') month = 7;
  else if (monthString === 'AUGUST') month = 8;
  else if (monthString === 'SEPTEMBER') month = 9;
  else if (monthString === 'OCTOBER') month = 10;
  else if (monthString === 'NOVEMBER') month = 11;
  else if (monthString === 'DECEMBER') month = 12;

  return getFormatDate(new Date(year, month-1, date));
}

/**
 * Transform js date object into YYYY/MM/DD format.
 * @param {date} date Input date.
 * @return {string} YYYY/MM/DD format of input date.
 */
function getFormatDate(date) {
  const year = date.getYear() + 1900;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return [year, (month>9 ? '' : '0') + month, (day>9 ? '' : '0') + day].join('/');
}

async function sleep(time) {
  return new Promise((resolve) => {
    console.log('Im gonna sleep for ' + time + 'ms.');
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export {getMillion, getDateByDayLeft, getDateFromStrMonth, sleep};