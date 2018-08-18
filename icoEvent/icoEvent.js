const {Builder, By} = require('selenium-webdriver');
const util = require('util');
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);
const {getMillion, getDateByDayLeft, getDateFromStrMonth} = require('./utility');

/**
 * Main function for crawling ICO event information.
 */
(async function main() {
  let driver = await new Builder().forBrowser('chrome').build();
  crawlICOEvent(driver);
})();

/**
 * Crawl ICO event.
 * @param {object} driver Selenium web driver.
 * @return {array} An array containing ICO event list and its information.
 */
async function crawlICOEvent(driver) {
  let icoEventList = await crawlICOEventFromICODrop(driver);
  let data = {
    from: 'icodrops',
    getEventList: true,
    getTraffic: false,
    data: icoEventList
  }
  await writeFile('./icoEvent(icodrops).json', JSON.stringify(data));
  return {};
}

/**
 * Crawl ICO event from ICO drops.
 * @param {object} driver Selenium web driver.
 * @return {object} An object containing ICO event list and its information.
 */
async function crawlICOEventFromICODrop(driver) {
  let icoEventList = [];
  const genre = ['active', 'ended'];

  for (let i=0; i<genre.length; i++) {
    console.log('Crawling ' + genre[i] + ' ico event from icodrops...');

    // get ico elements
    await driver.get(`https://icodrops.com/category/${genre[i]}-ico/`);
    let parentElement = await driver.findElement(By.css('div.all'));
    let icoElements = await parentElement.findElements(By.css('div.a_ico'));
    console.log('Total ' + icoElements.length + ' ' + genre[i] + ' ICO event.');

    // get ico event info (name, status, icoUrl, raised)
    for (let j=0; j<icoElements.length; j++) {
      let icoEvent = {};
      icoEvent.status = genre[i];

      try {
        // get ico event name
        let mainInfoElement = await icoElements[j].findElement(By.css('div.ico-main-info'));
        let nameElement = mainInfoElement.findElement(By.css('a'));
        icoEvent.name = await nameElement.getText();
        console.log('Crawling ' + icoEvent.name + ' name and raised money...');

        // get ico website url (not project website url)
        icoEvent.icoUrl = await nameElement.getAttribute('href');

        // get ico event raised money
        let raisedElement = await icoElements[j].findElement(By.css('div#new_column_categ_invisted')).findElement(By.css('span'));
        let raised = getMillion(await raisedElement.getText());
        icoEvent.raised = (isNaN(raised))? 'pending' : raised;
        // console.log(icoEvent.raised);
      } catch (e) {
        console.error(e);
      }
      // store icoEvent object in icoEventList
      icoEventList.push(icoEvent);
    }
  }

  // get each ico event end date and website url from their icoUrl page
  for (let i=0; i<icoEventList.length; i++) {
    let icoEvent = icoEventList[i];
    let year = 2018;
    let lastMonthString = '';

    try {
      console.log('Crawling ' + icoEvent.name + ' website url and end date...');
      await driver.get(icoEvent.icoUrl);

      // get ico event website url
      let linkElement = await driver.findElement(By.css('div.ico-right-col')).findElement(By.css('a'));
      let url = await linkElement.getAttribute('href');
      icoEvent.url = url;

      // get ico event end date
      let dateElement = await driver.findElement(By.css('div.sale-date'));
      let dateString;

      // Active ico event has two kinds of date format,
      // one is how many days left (12 days left)
      // the other is string month (15 Aug)
      // this part parse this two kinds of date format into YYYY/MM/DD
      if (icoEvent.status === 'active') {
        dateString = await dateElement.findElement(By.css('strong')).getText();
        if (dateString === 'is active') dateString = 'TBA';
        else {
          dateString = (dateString.split(' '))[0];
          dateString = getDateByDayLeft(Number(dateString));
        }
      } else if (icoEvent.status === 'ended') {
        dateString = await dateElement.getText();
        let dateArray = dateString.split(' ');

        // check if cross year
        if (lastMonthString === 'Jan' && dateArray[1] === 'Dec') year -= 1;

        dateString = getDateFromStrMonth(year, dateArray[1], Number(dateArray[0]));
        lastMonthString = dateArray[1];
      }

      icoEvent.endDate = dateString;
    } catch (e) {
      console.error(e);
    }
  }
  return icoEventList;
}
