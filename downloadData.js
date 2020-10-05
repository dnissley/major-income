require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { get } = require('lodash');

const pageSize = 10;

const cscApi = axios.create({
  baseURL: 'https://api.data.gov/ed/collegescorecard/v1/schools',
  timeout: 10000,
  params: {
    'api_key': process.env.COLLEGE_SCORECARD_API_KEY,
    'per_page': pageSize
  }
});

async function fetchPage (page) {
  console.log(`Requesting page ${page}`);

  const response = await cscApi.get('/', {
    params: {
      'school.ownership': '1,2',
      'school.operating': '1',
      'fields': [
        'id',
        'school.name',
        'school.city',
        'school.state',
        'latest.student.size',
        'latest.programs.cip_4_digit'
      ].join(),
      'page': page
    }
  });

  if (page === 0) {
    console.log();
    console.log(`Fetched the first page of data. Found ${response.data.metadata.total} schools matching the given criteria.`);
    console.log(`Will be fetching ${Math.ceil(response.data.metadata.total / pageSize)} pages at ${pageSize} results per page.`);
    console.log();
  }

  console.log(`Fetched ${response.data.results.length} schools info`);

  response.data.results.forEach(printSchoolInfo);

  return response.data.results;
}

function programFitsCriteria (program) {
  return programIsBachelorsDegree(program) && programHasDebtAndIncomeData(program);
}

function programIsBachelorsDegree (program) {
  return get(program, 'credential.level', 0) === 3;
}

function programHasDebtAndIncomeData (program) {
  return !!get(program, 'earnings.median_earnings')
    && !!get(program, 'earnings.count')
    && !!get(program, 'debt.median_debt')
    && !!get(program, 'debt.count');
}

function printSchoolInfo (school) {
  const schoolName = school['school.name'];
  const students = school['latest.student.size'] || '???';
  const allPrograms = school['latest.programs.cip_4_digit'] || [];
  const programsFittingCriteria = allPrograms.filter(programFitsCriteria);

  if (programsFittingCriteria.length === 0) return;

  console.log(`  School: ${schoolName}`);
  console.log(`    - # students: ${students}`);
  console.log(`    - # programs: ${allPrograms.length}`);
  console.log(`    - # programs fitting criteria: ${programsFittingCriteria.length}`);
  console.log();
}

function cleanProgram (program) {
  return {
    cipCode: program.code, // https://nces.ed.gov/ipeds/cipcode/browse.aspx?y=55
    name: program.title,
    earningsSampleSize: get(program, 'earnings.count'),
    medianEarnings: get(program, 'earnings.median_earnings'),
    debtSampleSize: get(program, 'debt.count'),
    medianDebt: get(program, 'debt.median_debt')
  };
}

function cleanSchool (school) {
  return {
    id: school['id'],
    name: school['school.name'],
    students: school['latest.student.size'],
    city: school['school.city'],
    state: school['school.state'],
    degrees: (school['latest.programs.cip_4_digit'] || []).map(cleanProgram)
  };
}

async function fetchAllData () {
  console.log('Starting to fetch data');

  const allResults = [];
  
  let page = 0;
  let pageResults = [];
  do {
    pageResults = await fetchPage(page);
    allResults.push(...pageResults);
    page++;
  } while (pageResults.length > 0);

  console.log('Done fetching data');

  console.log('Cleaning data');

  const cleanResults = allResults.map(cleanSchool);

  console.log('Finished cleaning data');

  console.log('Writing data to file');

  return new Promise((resolve, reject) => {
    fs.writeFile('schoolData.json', JSON.stringify(cleanResults, null, 2), (err) => {
      if (err) return reject(err);
      console.log('Finished writing data to schoolData.json');
      resolve();
    }); 
  });
}

fetchAllData().then(() => {
  console.log('Done downloading data');
});

