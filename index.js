const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const request = require('request');
const progress = require('request-progress');
const cliProgress = require('cli-progress');

let bookID = 0;

async function downloadFile(folder, file) {
  const fileName = file.title + '.mp3';

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    progress(request(file.url))
      .on('progress', function (state) {})
      .on('error', function (err) {
        console.log();
        console.log('download error', err);
        reject(err);
      })
      .on('end', function () {
        resolve(true);
      })
      .pipe(fs.createWriteStream(`${folder}/${fileName}`));
  });
}

async function nextBook() {
  bookID++;
  if (bookID > 100) return;

  // let baseURL = `https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?booknum=${bookID}&output=json&pub=nwt&fileformat=MP3%2CAAC&alllangs=0&langwritten=H&txtCMSLang=H`;
  let baseURL = `https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?booknum=${bookID}&output=json&pub=bi12&fileformat=MP3%2CAAC&alllangs=0&langwritten=H&txtCMSLang=H`;

  const resp = await fetch(baseURL);
  const json = await resp.json();

  if (json[0]?.status === 404) {
    console.log('Invalid book ID!!!');
    return await nextBook();
  }

  if (!fs.existsSync(json.parentPubName)) {
    fs.mkdirSync(json.parentPubName);
  }

  const folder = `${json.parentPubName}/${json.pubName}/`;

  const files = json.files.H.MP3;

  const pBar = new cliProgress.SingleBar(
    {
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  pBar.start(files.length, 0);
  let completed = 0;

  await Promise.all(
    files.map(async (file, key) => {
      await downloadFile(folder, { title: file.title, url: file.file.url });
      completed++;
      pBar.update(completed);
      return true;
    })
  );

  pBar.stop();

  console.log(`Book downloaded (ID: ${bookID})`);

  await nextBook();
}

nextBook();
