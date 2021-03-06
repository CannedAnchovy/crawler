import {Builder, By} from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import fs from 'fs';
import {readFile, writeFile, access} from '../fsPromise';
import {initializeCrawlList} from '../crawlList';
import {crawlListTraffic, checkAllTrafficSuccess} from '../similarweb';
import {getMillion, getDateByDayLeft, getDateFromStrMonth} from '../utility';
import {filterIcoEvent} from './filter';
import {icoEventListToCsvString} from '../csv';

let deadline;

/**
 * Crawl ico event.
 * @param {string} source ico event source website
 * @param {string} deadlineDate
 * @param {string} timeInterval
 * @param {string} fileName
 * @return {string} the name of the file stored all the data
 */
async function crawlICO(source, deadlineDate, timeInterval, fileName) {
  deadline = new Date(deadlineDate);
  fileName = 'data/icoEvent(' + fileName + ')';
  let icoEventList;

  console.log('I am ico crawler. Hi~');

  // check if ico event file already exist
  // if not, initialize it
  // if exist, read it from file
  try {
    console.log('Checking if ' + fileName + ' exist...');
    await access(fileName, fs.constants.F_OK);

    console.log(fileName + ' exist.');
    console.log('Read ' + fileName + ' into the crawler...');
    let data = await readFile(fileName, 'utf-8');
    icoEventList = JSON.parse(data);

    console.log('Read ' + fileName + ' success!');
  } catch (e) {
    console.log(fileName + ' doesn\'t exist.');

    icoEventList = initializeCrawlList(source);
    await writeFile(fileName, JSON.stringify(icoEventList, null, 2));
    console.log(fileName + ' created.');
  }

  const screen = {
    width: 2560,
    height: 1600,
  };

  // make chrome headless
  let driver = await new Builder().forBrowser('chrome').setChromeOptions(new chrome.Options().headless().windowSize(screen)).build();
  // let driver = await new Builder().forBrowser('chrome').build();

  // if crawler haven't crawl icoEventList, crawl it
  if (!icoEventList.crawlerStatus.getList) {
    console.log('Crawler haven\'t crawled event list.');
    try {
      console.log('Crawling ico event list...');
      icoEventList.data = await crawlICOEvent(driver, source);
      icoEventList.crawlerStatus.getList = true;
      await writeFile(fileName, JSON.stringify(icoEventList, null, 2));
      console.log('Finish crawling ico event list.');
    } catch (e) {
      console.log('Error occurred when crawling event list.');
      console.error(e);
      await driver.close();
      process.exit(1);
    }
  }

  // if crawler haven't crawl traffic, crawl it
  if (!icoEventList.crawlerStatus.getTraffic) {
    console.log('Crawler haven\'t finish crawling traffic.');
    try {
      console.log('Crawling ico event traffic...');

      let getData = (icoEventList) => icoEventList.data;

      await crawlListTraffic(driver, icoEventList, getData, fileName, timeInterval);
      if (checkAllTrafficSuccess(icoEventList.data)) {
        icoEventList.crawlerStatus.getTraffic = true;
      }
      await writeFile(fileName, JSON.stringify(icoEventList, null, 2));
      console.log('Finish crawling ico event traffic. (some data might be incomplete).');
    } catch (e) {
      console.log('Error occurred when crawling traffic.');
      console.error(e);
      await driver.close();
      process.exit(2);
    }
  }

  await driver.close();

  // if finish getting all data, convert it into csv format and output it
  if (icoEventList.crawlerStatus.getList && icoEventList.crawlerStatus.getTraffic) {
    try {
      console.log('Finish getting all data, output csv...');
      let csv = icoEventListToCsvString(icoEventList);
      await writeFile(fileName + '.csv', csv);
      console.log('Finish outputing csv.');
    } catch (e) {
      console.log('Error occurred when writing csv.');
      console.error(e);
      process.exit(3);
    }
  } else {
    console.log('Some job are still not done. But im going to rest now.');
    console.log('Restart me to finish those job.');
    process.exit(4);
  }

  console.log('Finish all jobs. I can rest now. :)');
  console.log('Bye~');
  return fileName;
}

/**
 * Crawl ICO event.
 * @param {object} driver Selenium web driver.
 * @param {object} source source website to get ico event
 * @return {array} An array containing current data status and ICO event list and its information.
 */
async function crawlICOEvent(driver, source) {
  let icoEventList;

  if (source === 'icodrops.com') {
    icoEventList = await crawlICOEventFromICODrop(driver);
  } else {
    throw new Error('I don\'t know how to crawl event from ' + source + '.');
  }
  return icoEventList;
}

/**
 * Crawl ICO event from ICO drops.
 * @param {object} driver Selenium web driver.
 * @return {array} An array containing ICO event list and its information.
 */
async function crawlICOEventFromICODrop(driver) {
  let icoEventList = [];
  const genre = ['active', 'ended'];

  for (let i=0; i<genre.length; i++) {
    console.log('Crawling ' + genre[i] + ' ico event from icodrops.com...');

    // get ico elements
    await driver.get(`https://icodrops.com/category/${genre[i]}-ico/`);
    let parentElement = await driver.findElement(By.css('div.all'));
    let icoElements = await parentElement.findElements(By.css('div.a_ico'));

    // for limit test case size
    // icoElements = icoElements.slice(0, 10);

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
  let lastMonthString = '';
  let year = 2019;
  let cropNum;
  for (let i=0; i<icoEventList.length; i++) {
    let icoEvent = icoEventList[i];

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
        if (dateString === 'IS ACTIVE') dateString = 'TBA';
        else {
          dateString = (dateString.split(' '))[0];
          dateString = getDateByDayLeft(Number(dateString));
        }
      } else if (icoEvent.status === 'ended') {
        dateString = await dateElement.getText();
        let dateArray = dateString.split(' ');

        // check if cross year
        if (lastMonthString === 'JANUARY' && dateArray[1] !== 'JANUARY') year -= 1;

        dateString = getDateFromStrMonth(year, dateArray[1], Number(dateArray[0]));
        lastMonthString = dateArray[1];
      }
      icoEvent.endDate = dateString;
      icoEvent.traffic = {success: false};

      let icoDate = new Date(dateString);
      if (icoDate < deadline) {
        cropNum = i;
        break;
      }
    } catch (e) {
      console.error(e);
    }
  }
  icoEventList = icoEventList.slice(0, cropNum - 1);
  return icoEventList;
}

/**
 * Filter icoEventList from specified file with filterIcoEvent function defined in filter.js
 * @param {fileName} fileName file that stores icoEventList
 * @return {object} the filtered icoEventList
 */
export async function getFilterIcoEventList(fileName) {
  let data = await readFile(fileName, 'utf-8');
  let icoEventList = JSON.parse(data);

  // if current file haven't completed crawling yet, terminate the process
  if (!(icoEventList.crawlerStatus.getList && icoEventList.crawlerStatus.getTraffic)) {
    console.log('This file hasn\'t finished crawling. Please crawlICO() this file first.');
    process.exit(1);
  }

  icoEventList.data = icoEventList.data.filter(filterIcoEvent);
  return icoEventList;
}

export default crawlICO;
