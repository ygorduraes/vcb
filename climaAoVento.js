import fetch from 'fetch-base64';

function lpad(num) {
  let ret = num;

  if (ret < 10) {
    ret = `0${num}`;
  }

  return `${ret}`;
}

function isGap(timeUTC) {
  const gapBegin = new Date(timeUTC.getFullYear(), timeUTC.getMonth(), timeUTC.getDate(), 0, 0);
  const gapEnd = new Date(timeUTC.getFullYear(), timeUTC.getMonth(), timeUTC.getDate(), 3, 0);

  if (timeUTC >= gapBegin && timeUTC <= gapEnd) {
    return true;
  }

  return false;
}

function getAdjustedUTCTime(localTime) {
  const yearUTC = localTime.getUTCFullYear();
  const monthUTC = localTime.getUTCMonth();
  const dayUTC = localTime.getUTCDate();
  const hoursUTC = localTime.getUTCHours();
  let minutesUTC = localTime.getUTCMinutes();
  const unitUTC = lpad(minutesUTC)[1];
  const tenUTC = lpad(minutesUTC)[0];
  let newTimeUTC = new Date();

  minutesUTC = `${tenUTC}1`;

  newTimeUTC = new Date(yearUTC, monthUTC, dayUTC, hoursUTC, minutesUTC);

  if (parseInt(unitUTC, 10) >= 6) {
    newTimeUTC = new Date(yearUTC, monthUTC, dayUTC, hoursUTC, minutesUTC);
  } else {
    newTimeUTC = new Date(yearUTC, monthUTC, dayUTC, hoursUTC, minutesUTC);
    newTimeUTC -= 1000 * 60 * 10;
    newTimeUTC = new Date(newTimeUTC);
  }

  // avoid snapshot gap between 00:00 and 03:00 UTC
  if (isGap(newTimeUTC)) {
    newTimeUTC = new Date(
      newTimeUTC.getFullYear(), newTimeUTC.getMonth(), newTimeUTC.getDate(), 0, 0,
    );
    newTimeUTC = new Date(newTimeUTC - 1);
    let newLocalTime = newTimeUTC - newTimeUTC.getTimezoneOffset() * 60 * 1000;
    newLocalTime = new Date(newLocalTime);
    newTimeUTC = getAdjustedUTCTime(newLocalTime);
  }

  return newTimeUTC;
}

export const base64Photo = async (url) => {
  try {
    const data = await fetch.remote(url);
    if (data[0]) {
      return data;
    }
  } catch {
    return false;
  }

  return false;
};

export default function getClimaAoVentoURL(localTime) {
  // https://cavsnapshots.s3.us-east-1.amazonaws.com/pa_belem-1/20220507/belem1.pa_2022-05-07_13-01-00_UTC_59s-tolerance_preview.jpg

  const now = localTime ?? new Date();
  const adjustedTime = getAdjustedUTCTime(now);

  const year = adjustedTime.getFullYear();
  let month = adjustedTime.getMonth();
  month = lpad(month + 1);
  let day = adjustedTime.getDate();
  day = lpad(day);
  let hours = adjustedTime.getHours();
  hours = lpad(hours);
  let minutes = adjustedTime.getMinutes();
  minutes = lpad(minutes);

  const baseURL = `https://cavsnapshots.s3.us-east-1.amazonaws.com/pa_belem-1/${year}${month}${day}/belem1.pa_${year}-${month}-${day}_${hours}-${minutes}-00_UTC_59s-tolerance_preview.jpg`;

  return baseURL;
}

// Tests
// const now = new Date();
// const photoURL = getClimaAoVentoURL(now);
// console.log(photoURL);
// console.log('Is URL valid?');
// base64Photo(photoURL)
//   .then((result) => console.log(result));
